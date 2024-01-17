using Microsoft.ClearScript;

namespace TailJs;

public record TrackerCookie
{
  public TrackerCookie(
    string? value,
    int? maxAge = null,
    bool httpOnly = false,
    SameSitePolicy? sameSitePolicy = null,
    bool isEssential = false
  )
  {
    Value = value;
    MaxAge = maxAge;
    HttpOnly = httpOnly;
    IsEssential = isEssential;
    SameSitePolicy = sameSitePolicy ?? SameSitePolicy.Lax;
  }

  [ScriptMember("fromRequest")]
  public bool FromRequest { get; set; }

  [ScriptMember("_originalValue")]
  public string? OriginalValue { get; set; }

  [ScriptMember("value")]
  public string? Value { get; }

  [ScriptMember("maxAge")]
  public int? MaxAge { get; }

  [ScriptMember("httpOnly")]
  public bool HttpOnly { get; }

  [ScriptMember("essential")]
  public bool IsEssential { get; }

  public SameSitePolicy SameSitePolicy { get; }

  // ReSharper disable once InconsistentNaming
  internal string sameSitePolicy => SameSitePolicy.ToString();
}

public enum SameSitePolicy
{
  Strict,
  Lax,
  None
}
