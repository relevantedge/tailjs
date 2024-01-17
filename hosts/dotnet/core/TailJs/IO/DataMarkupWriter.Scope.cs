using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace TailJs.IO;

public partial class DataMarkupWriter
{
  private ScopeState _scope = new();
  private BufferedStack<ScopeState> _scopes = new();
  private BufferedStack<int> _skipScopeLevels = new(int.MaxValue);
  private int _scopeEndedLevel = int.MinValue;
  private BufferedStack<string> _scopeDataItems = new();

  public JsonSerializerOptions JsonSerializerOptions { get; }

  /*
   * Scope syntax:
   *
   * ```
   * Attribute                 := ^ValueOrStackOperation(\|ValueOrStackOperation)*$
   * ValueOrStackOperation := Base36Number | '' | [^\-][^|]+ | JSON
   * Base36Number = -?[a-z0-9]+
   * JSON = "A valid JSON string"
   * ```
   *
   * Every element associated with data as han attribute `_t` that contains information about how the scope _is modified_.
   * The scope is a stack where the data associated with elements are pushed and popped at the current DOM level (elements with the same parent).
   * The concept is used to pack the associated data for reducing the output size.
   *
   * The value list is implicitly a JSON array, so brackets `[]` are omitted.
   * - A negative number (base 36, -1 written as '-') means that the corresponding number of values are popped off the scope.
   * - An empty first value keeps the stack (alone `<div _t/>`, in sequence `<div _t=|value`).
   * - A positive number is pointer to the 1-indexed reference array.
   * - Anything else than a negative or empty first value clears the stack.
   *
   * An element in the scope will get the values in the scope associated after it has been modified as per its `_t` attribute.
   *
   */

  public ScopeHandle BeginScope(params object[] values) => BeginScope((IReadOnlyCollection<object>)values);

  public ScopeHandle BeginScope(IReadOnlyCollection<object> values)
  {
    if (values.Count == 0)
    {
      return default;
    }

    ScopeState nextScope;
    if (_scope.Level == _effectiveParserLevel)
    {
      nextScope = new ScopeState(
        _effectiveParserLevel,
        _scope.PendingValues,
        values.Count,
        _scope.Delta,
        _scope.PendingAttributeQuote,
        0,
        false
      );
    }
    else
    {
      nextScope = new ScopeState(_effectiveParserLevel, new(), values.Count, null, default, 0, true);
    }

    foreach (var value in values.Select(GetAttributeEncodedValue))
    {
      if (_valueReferences != null)
      {
        if (!_valueReferences.TryGetValue(value, out var reference))
        {
          _valueReferences.Add(value, reference = _valueReferences.Count);
        }
        nextScope.PendingValues.Push(Base36.Encode(reference));

        continue;
      }

      if (value.IndexOfAny(RequireAttributeQuoteChars) != -1)
      {
        // The attribute value needs to be quoted. This will already be set if any previously pending value needed quotes.
        nextScope.PendingAttributeQuote = '\'';
      }

      nextScope.PendingValues.Push(value);
    }

    _scopes.Push(_scope);
    _scope = nextScope;

    return new ScopeHandle(this);
  }

  private void EndScope()
  {
    var previousScope = _scope;
    _scope = _scopes.Pop();
    if (!previousScope.HasOwnBuffer) // The previous scope were at the same parser level
    {
      if (previousScope.PendingValues.Length == 0)
      {
        // Pending values have been written. Carry on the delta and empty buffer to the new scope.
        _scope.Delta = (previousScope.Delta ?? 0) - previousScope.OwnValueCount;
        _scope.PendingValues = previousScope.PendingValues;
      }
    }
    else
    {
      previousScope.Dispose(); // Done with this. Clean.
    }

    _scopeEndedLevel = previousScope.Level;
  }

  private string GetAttributeEncodedValue(object data)
  {
    if (
      data is string { Length: > 0 } s
      && (
        GetValidJsonEnd(s[0]) == s[s.Length - 1]
        || (_valueReferences == null && s[0] != '-' && s.IndexOf('|') == -1)
      )
    )
    {
      return s;
    }
    var json = JsonSerializer.Serialize(data, JsonSerializerOptions);
    return json.Length > 0 && json[0] == '-' ? JsonSerializer.Serialize(json) : json; // A negative number must be encoded as a string.
  }

  private void ClearScopes()
  {
    while (_scopes.Length > 0)
    {
      _scope = _scopes.Pop();
      if (_scope.HasOwnBuffer)
      {
        _scope.Dispose();
      }
    }
  }

  public void IgnoreNextScope() => _skipScopeLevels.Push(_parserLevel);

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  private bool HasAttributeValue() => _effectiveParserLevel == _scope.Level && _scope.OwnValueCount > 0;

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  private bool BuildAttributeValue(char quote, bool keepCurrent)
  {
    // INV: This method is only called if the parser level matches the scope level.

    _attributeValue.Clear();

    var delta = keepCurrent ? 0 : _scope.Delta;
    if (delta.HasValue)
    {
      if (delta != 0)
      {
        _attributeValue.Append(delta == -1 ? "-" : Base36.Encode(delta.Value));
      }
    }

    if (_scope.Level == _effectiveParserLevel)
    {
      if (!keepCurrent)
      {
        _scope.Delta = 0;
      }

      var sep = delta.HasValue;
      foreach (var value in _scope.PendingValues.GetSpan())
      {
        if (sep == (sep = true))
        {
          _attributeValue.Append(Separator);
          sep = true;
        }
        _attributeValue.Append(
          quote switch
          {
            '\'' => value.Replace("'", "&#39;"),
            '"' => value.Replace("\"", "&#34;"),
            _ => value
          }
        );
      }

      _scope.ClearValues();
    }

    return delta.HasValue || _attributeValue.Length > 0;
  }

  private static char GetValidJsonEnd(char p) =>
    p switch
    {
      '{' => '}',
      '[' => ']',
      '"' => '"',
      _ => default
    };

  #region Nested type: ScopeHandle

  public struct ScopeHandle : IDisposable
  {
    private DataMarkupWriter? _owner;

    public ScopeHandle(DataMarkupWriter owner)
    {
      _owner = owner;
    }

    public void End()
    {
      if (_owner == null)
      {
        return;
      }

      _owner.EndScope();
      _owner = null;
    }

    #region IDisposable Members

    void IDisposable.Dispose() => End();

    #endregion
  }

  #endregion


  #region Nested type: ScopeState

  private struct ScopeState : IDisposable
  {
    public int Level;

    public BufferedStack<string> PendingValues;

    public int OwnValueCount;

    public int? Delta;

    public char PendingAttributeQuote;

    public int MarkersWritten;

    public readonly bool HasOwnBuffer;

    public ScopeState() : this(0, new(), 0, null, default, 0, true) { }

    public ScopeState(
      int level,
      BufferedStack<string> pendingValues,
      int ownValueCount,
      int? delta,
      char pendingAttributeQuote,
      int markersWritten,
      bool hasOwnBuffer
    )
    {
      OwnValueCount = ownValueCount;
      Level = level;
      PendingValues = pendingValues;
      Delta = delta;
      PendingAttributeQuote = pendingAttributeQuote;
      MarkersWritten = markersWritten;
      HasOwnBuffer = hasOwnBuffer;
    }

    public void ClearValues()
    {
      PendingValues.Clear();
      PendingAttributeQuote = default;
    }

    #region IDisposable Members

    public void Dispose()
    {
      if (HasOwnBuffer)
      {
        PendingValues.Dispose();
      }
    }

    #endregion
  }

  #endregion


  #region Scope data blocks

  private static readonly char[] ScopeDataEncodedChars = { '>', '|' };

  private string ScopeDataEncode(string data) =>
    data.IndexOfAny(ScopeDataEncodedChars) == -1 ? data : data.Replace(">", "\\>").Replace("|", "\\|"); // Two string replaces are presumably faster than regex.

  private string ScopeDataDecode(string data) =>
    data.IndexOfAny(ScopeDataEncodedChars) == -1 ? data : data.Replace("\\>", ">").Replace("\\|", ">");

  public string GetScopeDataHeader(params object[] data) => GetScopeDataHeader(data.AsEnumerable());

  public string GetScopeDataHeader(IEnumerable<object> data) =>
    // Escape closing angle brackets to allow the end sequence "-->" to be part of the data instead of mangling the output.
    $"{ScopeDataStartMarker} {string.Join("|", data.Select(data => ScopeDataEncode(GetAttributeEncodedValue(data))))}{ScopeDataEndMarker}";

  public string GetScopeDataFooter() => ScopeEndMarker;

  private void ParseScopeDataBlock(string data)
  {
    if (data == "pop")
    {
      // Don't throw exception. We do not want to crash whatever application is using this.
      // Write a polite error comment instead
      if (_scopes.Length == 0)
      {
        _markerBuffer.Append("<!--Invalid pop marker: No current scope.-->");
      }
      else
      {
        EndScope();
      }
    }
    else
    {
      _scopeDataItems.Clear();
      foreach (Match item in Regex.Matches(data, @"\s*(?<Data>(?:(?<=\\)\||[^|])+)\s*"))
      {
        _scopeDataItems.Push(ScopeDataDecode(item.Groups["Data"].Value));
      }

      BeginScope(_scopeDataItems);
    }
  }

  #endregion
}
