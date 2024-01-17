using System;

namespace TailJs.Model;

public record UserAgentLanguage(
  string Id,
  string Language,
  bool Primary,
  long Preference,
  string? Region = null
)
{
  /// <summary>
  /// The full language tag as specified by (RFC 5646/BCP 47)[https://datatracker.ietf.org/doc/html/rfc5646]
  /// </summary>
  public string Id { get; set; } = Id;
  
  /// <summary>
  /// The language name (ISO 639).
  /// </summary>
  public string Language { get; set; } = Language;
  
  /// <summary>
  /// If it is the users primary preference.
  /// </summary>
  public bool Primary { get; set; } = Primary;
  
  /// <summary>
  /// The user&#39;s preference of the language (1 is highest).
  /// </summary>
  public long Preference { get; set; } = Preference;
  
  /// <summary>
  /// Dialect (ISO 3166 region).
  /// </summary>
  public string? Region { get; set; } = Region;
}


