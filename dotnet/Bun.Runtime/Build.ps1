[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$PackageName = "Bun.Runtime",

    [Parameter(Mandatory = $false)]
    [string]$Version = "1.3.14",
    
    [Parameter(Mandatory = $false)]
    [string]$PrereleaseVersion = "-rc1"
)

$PackageVersion = "$Version$PrereleaseVersion"

$ErrorActionPreference = "Stop"

# Define mappings: NuGet RID => Bun Platform Target
$Platforms = @{
    "win-x64"       = "windows-x64"
    "osx-x64"       = "darwin-x64"
    "osx-arm64"     = "darwin-aarch64"
    "linux-x64"     = "linux-x64"
    "linux-arm64"   = "linux-aarch64"
}

$WorkspaceRoot = $PSScriptRoot
$TemplatesDir = Join-Path $WorkspaceRoot "templates"
$ArtifactsDir = Join-Path $WorkspaceRoot "artifacts"
$BuildDir = Join-Path $WorkspaceRoot ".build"
$PackageBaseName = $PackageName

# Ensure clean artifacts directory
if (Test-Path $ArtifactsDir) { Remove-Item -Path $ArtifactsDir -Recurse -Force }
New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null

# Verify templates exist
$RequiredTemplates = @("runtime.nuspec.template", "runtime.targets.template", "umbrella.nuspec.template")
foreach ($Tpl in $RequiredTemplates) {
    if (-not (Test-Path (Join-Path $TemplatesDir $Tpl))) {
        throw "Missing required template: $Tpl in $TemplatesDir"
    }
}

$TargetsContent = ""
$DependenciesContent = ""

function CopyTemplate {
  param (
      [string]$Source,
      [string]$Target
  )
  $Content = Get-Content $Source -Raw
  $Content = $Content -replace "\{\{PackageName\}\}", $PackageName
  $Content = $Content -replace "\{\{Version\}\}", $PackageVersion
  $Content = $Content -replace "\{\{Rid\}\}", $Rid
  $Content = $Content -replace "\{\{ExeName\}\}", $ExeName  
  $Content = $Content -replace "\{\{Targets\}\}", $TargetsContent
  $Content = $Content -replace "\{\{PlatformCondition\}\}", $PlatformCondition
  
  
  Set-Content -Path $Target -Value $Content -Encoding UTF8
}



# 1. Process each Runtime Identifier (RID)
foreach ($Entry in $Platforms.GetEnumerator()) {
    $Rid = $Entry.Key
    $BunPlatform = $Entry.Value
    
    $PackageName = "$PackageBaseName.$Rid"
    Write-Host "`n--- Processing $Rid ---" -ForegroundColor Cyan
    $PackageDir = Join-Path $BuildDir "$PackageName$PrereleaseVersion"
        
    $TargetDir = Join-Path $PackageDir "runtimes" $Rid "native"
    $BuildDir = Join-Path $PackageDir "build"
    
    # Scaffold directories
    if (Test-Path $PackageDir) { Remove-Item $PackageDir -Recurse -Force }
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
    New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null
    
    if ($Rid -notmatch "win") { New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null }

    # Download & Extract
    $Url = "https://github.com/oven-sh/bun/releases/download/bun-v$Version/bun-$BunPlatform.zip"
    $ZipPath = Join-Path $env:TEMP "bun-$BunPlatform.zip"
    $ExtractPath = Join-Path $WorkspaceRoot ".downloads" "bun-extract-$BunPlatform"

    if (Test-Path $ExtractPath)
    {
      Write-Host "$BunPlatform v$Version already downloaded." -ForegroundColor Gray
    } else {
      Write-Host "Downloading $BunPlatform v$Version..." -ForegroundColor Gray
      Invoke-WebRequest -Uri $Url -OutFile $ZipPath
      Expand-Archive -Path $ZipPath -DestinationPath $ExtractPath -Force
    }
    
    if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

    # Locate and copy executable
    
    $ExtractedExe = Get-ChildItem -Path $ExtractPath -Filter bun.* -Recurse | Select-Object -First 1
    

    if ($Rid -match "win") { $Os = "Windows" }
    if ($Rid -match "linux") { $Os = "Linux" }
    if ($Rid -match "osx") { $Os = "OSX" }
    if ($Rid -match "x64") { $Platform = "X64" }
    if ($Rid -match "arm64") { $Platform = "Arm64" }
    
    
    $PlatformCondition = "'`$(RuntimeIdentifier)' == '' AND `$([MSBuild]::IsOsPlatform('$Os')) AND '`$(Platform)' == '$Platform'"
    
    if ($null -eq $ExtractedExe) { throw "Could not find $ExeName for $Rid" }
    $ExeName = $ExtractedExe.Name
    Copy-Item -Path $ExtractedExe.FullName -Destination (Join-Path $TargetDir $ExeName) -Force

    # Generate .nuspec from template
    Write-Host "Generating $PackageName files..." -ForegroundColor Gray
    $NuspecPath = Join-Path $PackageDir "$PackageName.nuspec"
    
    CopyTemplate (Join-Path $TemplatesDir "runtime.nuspec.template") $NuspecPath    
    CopyTemplate (Join-Path $TemplatesDir "runtime.targets.template") (Join-Path $BuildDir "$PackageName.targets")
    Copy-Item -Path (Join-Path $TemplatesDir "LICENSE.txt") -Destination (Join-Path $PackageDir "LICENSE.txt")
    Copy-Item -Path (Join-Path $TemplatesDir "runtime.README.md") -Destination (Join-Path $PackageDir "README.md")
    
    $TargetsContent = @"
$TargetsContent
  <ItemGroup Condition="'`$(RuntimeIdentifier)' == '$Rid' OR ($PlatformCondition)">
      <PackageReference Include="$PackageName" Version="$PackageVersion" />
  </ItemGroup>
"@

    # Pack the RID package
    Write-Host "Packing $PackageName..." -ForegroundColor Yellow
    dotnet pack $NuspecPath --output $ArtifactsDir
}

# 2. Process the Umbrella Package
Write-Host "`n--- Processing Umbrella Package ---" -ForegroundColor Cyan

$PackageName = $PackageBaseName

$PackageDir = Join-Path $BuildDir $PackageName$PrereleaseVersion
$NuspecPath = Join-Path $PackageDir "$PackageName.nuspec"
$BuildDir = Join-Path $PackageDir "build"

if (Test-Path $PackageDir) { Remove-Item $PackageDir -Recurse -Force }
New-Item -ItemType Directory -Path $PackageDir -Force | Out-Null
New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null


CopyTemplate (Join-Path $TemplatesDir "umbrella.nuspec.template") $NuspecPath
CopyTemplate (Join-Path $TemplatesDir "umbrella.targets.template") (Join-Path $BuildDir "$PackageName.targets")
Copy-Item (Join-Path $TemplatesDir "umbrella.README.md") -Destination (Join-Path $PackageDir "README.md")

Write-Host "Packing $PackageName (Umbrella)..." -ForegroundColor Yellow
dotnet pack $NuspecPath --output $ArtifactsDir

Write-Host "`n✅ Build complete! All .nupkg files are ready in the '$ArtifactsDir' directory." -ForegroundColor Green


