using System.Text.Json;

namespace TailJs.IO;

/// <summary>
/// Converts PascalCase and camelCased identifiers to kebab-cased.
/// This is a reasonable syntax convention from typescript enums.
/// </summary>
public sealed class KebabCaseNamingPolicy : JsonNamingPolicy
{
  public static KebabCaseNamingPolicy Instance { get; } = new();

  private KebabCaseNamingPolicy() { }

  public override string ConvertName(string name)
  {
    if (name.Length > 512)
    {
      throw new NotSupportedException("Identifiers longer than 512 chars are not supported.");
    }
    if (string.IsNullOrEmpty(name) || !char.IsUpper(name[0]))
    {
      return name;
    }

    var dashes = 0;
    var source = name.AsSpan();
    var prevIsUpper = false;
    var hasUpper = false;
    for (var i = 0; i < source.Length; i++)
    {
      if (char.IsUpper(source[i]))
      {
        hasUpper = true;
        if (i > 0 && !prevIsUpper)
        {
          ++dashes;
        }

        prevIsUpper = true;
        continue;
      }

      prevIsUpper = false;
    }

    if (!hasUpper)
    {
      // No upper-case letters;
      return name;
    }

    Span<char> kebabed = stackalloc char[source.Length + dashes];

    var targetIndex = 0;
    prevIsUpper = false;
    for (var i = 0; i < source.Length; i++)
    {
      if (char.IsUpper(source[i]))
      {
        if (i > 0 && !prevIsUpper)
        {
          kebabed[targetIndex++] = '-';
        }

        kebabed[targetIndex++] = char.ToLower(source[i]);
        prevIsUpper = true;
        continue;
      }

      prevIsUpper = false;
      kebabed[targetIndex++] = source[i];
    }

    return kebabed.Slice(0, targetIndex).ToString();
  }
}
