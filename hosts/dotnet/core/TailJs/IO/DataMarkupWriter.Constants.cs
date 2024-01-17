namespace TailJs.IO;

public partial class DataMarkupWriter
{
  private static readonly char[] RequireAttributeQuoteChars = { '\'', '"', ' ' };

  private const string ScopeDataStartMarker = "<!--@scope: "; // Space to avoid unintended pop
  private const string ScopeDataEndMarker = "-->";
  private const string ScopeEndMarker = "<!--@scope:pop-->";

  // Skip sequences. The longest is "</textarea>" at 11 chars (used for SequenceTester fixed buffer)
  private static readonly SequenceTester EndOfBodyTest = "/body";
  private static readonly SequenceTester CommentStartTest = "!--"; // The '<' has already been read when this is in effect
  private static readonly SequenceTester CommentEndTest = "-->";
  private static readonly SequenceTester ScopeDataStartTest = "@scope:"; // Implicitly includes the comment prefix, so it is "<!--@scope:" in source.

  private const char Separator = '|';

  private static readonly Dictionary<string, SequenceTester> NonHtmlTags =
    new()
    {
      { "script", "</script>" },
      { "style", "</style>" },
      { "textarea", "</textarea>" }, // Longest skip test at 11 chars.
      { "xmp", "</xmp>" }
    };

  private static readonly HashSet<string> SelfClosingTags =
    new(
      new[]
      {
        "!doctype", // Longest tag name to use for fixed array size in TagNameBuffer
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "link",
        "meta",
        "param",
        "source",
        "track",
        "wbr"
      }
    );

  private static readonly HashSet<string> IgnoreTags =
    new(new[] { "html", "!doctype", "head", "meta", "base", "script", "link", "param", "area", "style" });

  #region Nested type: State

  private enum State
  {
    ReadTagStartOrText,
    ReadText,
    ReadNonHtml,
    ReadTagNameStart,
    ReadStartTagName,
    ReadAttributes,
    ReadAttributeName,
    ReadAttributeQuote,
    ReadAttributeValue,
    ReadTagEnd,
    TryReadScopeDataStart,
    ReadScopeData
  }

  #endregion
}
