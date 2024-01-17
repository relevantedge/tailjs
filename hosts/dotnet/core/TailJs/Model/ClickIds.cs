using System;

namespace TailJs.Model;

public record ClickIds(
  string? Google = null,
  string? GoogleDoubleClick = null,
  string? Facebook = null,
  string? Microsoft = null,
  string? GoogleAnalytics = null
)
{
  public string? Google { get; set; } = Google;
  
  public string? GoogleDoubleClick { get; set; } = GoogleDoubleClick;
  
  public string? Facebook { get; set; } = Facebook;
  
  public string? Microsoft { get; set; } = Microsoft;
  
  public string? GoogleAnalytics { get; set; } = GoogleAnalytics;
}


