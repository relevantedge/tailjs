---
title: ASP.NET
sidebar:
  order: 10
---

## Installation

### Install the NuGet package

```sh frame="none"
dotnet add package TailJs.AspNet
```

### Register the services

```c# title="Program.cs"
var builder = WebApplication.CreateBuilder(args);

// Whatever you already have...
builder.Services.AddRazorPages();
builder.Services.AddControllersWithViews();

// And then
builder.Services.AddTailJs(builder.Config);
// To track Razor views as components
app.AddSingleton<IModelTypeMapper, RazorComponentMapper>()

var app = builder.Build();

app.UseTailJs();

// ...
```

This will automatically inject the client script in your pages and start tracking Razor views as components.

## Configuration

The configuration is shown with default values below.

```json title="appsettings.json"
{
  "TailJs": {
    "TrackerName": "tail",
    "ResourcePath": "res",
    "Endpoint": "/_t.js",
    "Secure": true,
    "ScriptExtensions": []
  }
}
```

### TrackerName

The name of the tracker object used client side.
Change this if you have special naming requirements, or don't like`tail.push()` and would rather prefer something like `analytics.push()`.

### ResourcePath

This is the path to the directory where the server engine looks for resources.
Resources are for example the GeoIP2 database or certificates for database connections.

### EndPoint

This is the route used by the tracker. You might be in a situation where all service end-points must go under, e.g. `/api/*`.

### Secure

Whether the `Secure` option is added to cookies. Only change this for development if you testing on a local `http://` site.

### ScriptExtensions

This is where you register extensions for the engine. You will need to add at least an extension for a database
if you want the collected events to be stored (you do). Please refer to the "integrations" section in the sidebar
to see the available options if you don't want to build your own.
(For example use the bundled [RavenDB extension](/guides/extensions/ravendb/))

You probably also want [client location](/guides/extensions/maxmind/).

## Next steps

### Mapping of pages and components

If you are using a CMS without an existing integration package, or have a custom solution you can implement on or more
`IContextItemResolver` that defines the "context" (typically page) that gets tracked. If not, the path from the URL is used.

You may also want `IModelTypeMapper`s that maps the model types from Razor views to components that gets tracked. If not,
the name of the razor .cshtml file is used.

For examples on how `IContextItemResolver` and `IModelTypeMapper` may be implemented, look at the Umbraco integration.

### Custom tracker extensions

You will currently need to do it in TypeScript if you want to add your own tracker extensions. Add the transpiled JavaScript files
to your ressource directory and reference them like

```json title="appsettings.json"
"TailJs": {
  // ...
  "ScriptExtensions": [
    // ...
    {
      "Module": "js/{your script}.js",
      "Import": "{Name of the exported class for the extension}",
      "Settings": {
        // Whatever settings you have defined for your extension.
      }
     }
  ]
}
```

Native .NET extensions are currently under development.
