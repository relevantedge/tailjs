using System.Runtime.CompilerServices;


// ReSharper disable FieldCanBeMadeReadOnly.Local

namespace TailJs.IO;

public partial class DataMarkupWriter
{
  private State _state = State.ReadTagStartOrText;

  private bool _atWhitespace;
  private SequenceTester _skipTestSequence = SequenceTester.None;
  private TagNameBuffer _tagName;

  private char _currentAttributeQuote;
  private bool _elementHasAttribute;
  private bool _selfClosing;
  private bool _readAttributeValue;
  private int _parserLevel;
  private int _effectiveParserLevel; // Parser level excluding skips

  private int _writeSkipCount;
  private CharBuffer _readAheadBuffer = new();

  private SequenceTester _endOfBody = EndOfBodyTest;
  private SequenceTester _scopeDataStart = ScopeDataStartTest;

  private unsafe int Take(ReadOnlySpan<char> chars)
  {
    fixed (char* p = chars)
    {
      return Take(p, chars.Length);
    }
  }

  private unsafe int Take(char* pp, int length)
  {
    _writeSkipCount = 0;
    var i = 0;

    var p = *pp;

    switch (_state)
    {
      case State.ReadText:
        if (p == '<')
        {
          _state = State.ReadTagStartOrText;
          goto case State.ReadTagStartOrText;
        }
        if (++i < length)
        {
          p = *++pp;
          goto case State.ReadText;
        }
        return length;

      case State.ReadTagStartOrText:

        if (p == '<')
        {
          _tagName.Reset();
          _skipTestSequence = CommentStartTest;
          _endOfBody.Reset();
          _scopeEndedLevel = int.MinValue;

          // Don't write out before we know if we have scope data, but don't write to read-ahead buffer yet since this code branch happens a lot.
          // A _writeSkipCount of 1 with an empty buffer means that the '<' must be materialized (added).
          _writeSkipCount = 1;
          _state = State.ReadTagNameStart;

          if (++i < length)
          {
            p = *++pp;
            goto case State.ReadTagNameStart;
          }

          EnsureReadAheadBuffer(); // The '<' needs to be explicit since we carry on the buffer.
          return length;
        }

        _writeSkipCount = 0;

        if (!IsHtmlWhitespace(p))
        {
          //There might be whitespace between tags. We don't want to mark that.
          _state = State.ReadText;

          if (_scopeEndedLevel >= _effectiveParserLevel)
          {
            AppendTextMarker(true);
          }

          if (_scope.MarkersWritten == 0 && HasAttributeValue())
          {
            AppendTextMarker();
          }
          _scopeEndedLevel = int.MinValue;

          if (_markerBuffer.Length > 0)
          {
            return i;
          }
          goto case State.ReadText;
        }

        if (++i < length)
        {
          p = *++pp;
          goto case State.ReadTagStartOrText;
        }

        return length;

      case State.ReadTagNameStart:

        if (_skipTestSequence.Success)
        {
          _skipTestSequence = CommentEndTest;
          _state = State.TryReadScopeDataStart;
          goto case State.TryReadScopeDataStart;
        }
        if (_endOfBody.Success)
        {
          if (_injectAtEndOfBody?.Invoke(GetValueReferences()) is { } injected)
          {
            _markerBuffer.Append(injected);
          }

          FlushToState(State.ReadTagEnd);
          return i;
        }
        if (_skipTestSequence.Test(p) || _endOfBody.Test(p))
        {
          EnsureReadAheadBuffer();
          AppendReadAheadBuffer(p);
          if (++i < length)
          {
            p = *++pp;
            goto case State.ReadTagNameStart;
          }
          return length;
        }
        if (_readAheadBuffer.Length > 0)
        {
          if (_readAheadBuffer.Length == 1)
          {
            // We only have an '<' from a short chunk read previously.
            // Flush it and read the character again as normal.
            FlushReadAheadBuffer();
            return i;
          }

          if (!IsValidTagStart(_readAheadBuffer[1]))
          {
            // This is a different case than IsValidTagStart check below, we are not at the first tag char.
            FlushToState(State.ReadTagStartOrText);
            return i;
          }

          if (_readAheadBuffer[1] == '!')
          {
            _tagName.Append('!');
            FlushToState(State.ReadStartTagName);
          }
          else
          {
            FlushToState(State.ReadTagEnd);
          }

          return i;
        }
        if (!IsValidTagStart(p))
        {
          // This will get interpreted as text in this state.
          _state = State.ReadTagStartOrText;
          goto case State.ReadTagStartOrText;
        }

        if (p == '/')
        {
          _state = State.ReadTagEnd;
          goto case State.ReadTagEnd;
        }

        _writeSkipCount = 0;
        _state = State.ReadStartTagName;
        goto case State.ReadStartTagName;

      case State.ReadStartTagName:

        if (IsHtmlWhitespace(p) || IsTagEndChar(p))
        {
          _elementHasAttribute = false;
          _state = State.ReadAttributes;
          goto case State.ReadAttributes;
        }

        _tagName.Append(ToLowerCase(p));

        if (++i < length)
        {
          p = *++pp;
          goto case State.ReadStartTagName;
        }

        return length;

      case State.ReadAttributes:
        if (IsTagEndChar(p))
        {
          _state = State.ReadTagEnd;
          if (!_elementHasAttribute && HasAttributeValue())
          {
            var tagNameString = _tagName.ToString();
            if (IgnoreTags.Contains(tagNameString))
            {
              if (_skipHtmlScope && tagNameString == "html")
              {
                IgnoreNextScope();
              }
            }
            else
            {
              AppendAttributeValue(
                includeName: true,
                includeAssignment: true,
                writeQuotes: true,
                quoteChar: _scope.PendingAttributeQuote,
                prefix: _atWhitespace ? default : ' ',
                keepCurrent: false
              );
              return i;
            }
          }

          _elementHasAttribute = false; // Reset for next time.
          goto case State.ReadTagEnd;
        }

        if (!IsHtmlWhitespace(p))
        {
          _readAttributeValue = false;
          _skipTestSequence = new(_attributeName);
          _state = State.ReadAttributeName;
          goto case State.ReadAttributeName;
        }

        if (++i < length)
        {
          p = *++pp;
          goto case State.ReadAttributes;
        }

        return length;

      case State.ReadAttributeName:

        if (p == '=')
        {
          // Attribute with assignment
          _currentAttributeQuote = default;
          _atWhitespace = false;
          _state = State.ReadAttributeQuote;
          if (++i < length)
          {
            p = *++pp;
            goto case State.ReadAttributeQuote;
          }

          return length;
        }

        if (IsTagEndChar(p) || (_atWhitespace && !IsHtmlWhitespace(p)))
        {
          _state = State.ReadAttributes;
          if (
            _skipTestSequence.Success
            && _effectiveParserLevel == _scope.Level
            && AppendAttributeValue(
              includeName: false,
              includeAssignment: true,
              writeQuotes: true,
              quoteChar: _scope.PendingAttributeQuote,
              prefix: default,
              keepCurrent: false
            )
          )
          {
            if (!IsTagEndChar(p))
            {
              _markerBuffer.Append(' ');
            }
            return i;
          }

          goto case State.ReadAttributes;
        }

        if (!IsHtmlWhitespace(p))
        {
          _skipTestSequence.Test(p);
        }

        if (++i < length)
        {
          p = *++pp;
          goto case State.ReadAttributeName;
        }

        return length;

      case State.ReadAttributeQuote:
        if (!IsHtmlWhitespace(p))
        {
          if (p is '\'' or '"')
          {
            _currentAttributeQuote = p;
            _state = State.ReadAttributeValue;
            if (++i < length)
            {
              p = *++pp;
              goto case State.ReadAttributeValue;
            }

            return length;
          }

          _currentAttributeQuote = ' ';
          _state = State.ReadAttributeValue;
          if (_scope.PendingAttributeQuote != default)
          {
            // Insert missing quote.
            _markerBuffer.Append(_scope.PendingAttributeQuote);
            return length;
          }

          _state = State.ReadAttributeValue;
          goto case State.ReadAttributeValue;
        }

        if (++i < length)
        {
          p = *++pp;
          goto case State.ReadAttributeQuote;
        }

        return length;

      case State.ReadAttributeValue:
        if (
          p == _currentAttributeQuote
          || (_currentAttributeQuote == ' ' && (IsHtmlWhitespace(p) || IsTagEndChar(p)))
        )
        {
          _state = State.ReadAttributes;
          if (_skipTestSequence.Success && _effectiveParserLevel == _scope.Level)
          {
            _elementHasAttribute = true;
            var quote =
              _currentAttributeQuote == default ? _scope.PendingAttributeQuote : _currentAttributeQuote;

            AppendAttributeValue(
              includeName: false,
              includeAssignment: false,
              writeQuotes: false,
              // If we have an existing quote, use that for encoding.
              quoteChar: quote,
              prefix: _readAttributeValue ? Separator : default,
              keepCurrent: false
            );

            if (quote != default && _currentAttributeQuote == default)
            {
              // We need to append a quote.
              _markerBuffer.Append(_scope.PendingAttributeQuote);
              _scope.PendingAttributeQuote = default;
            }

            return i;
          }

          if (IsTagEndChar(p) || ++i < length)
          {
            p = *++pp;
            goto case State.ReadAttributes;
          }

          return length;
        }

        _readAttributeValue = true;

        if (++i < length)
        {
          p = *++pp;
          goto case State.ReadAttributeValue;
        }

        return length;

      case State.TryReadScopeDataStart:
        if (_ignoreScopeData || !_scopeDataStart.TestOrReset(p))
        {
          _skipTestSequence = CommentEndTest;
          _state = State.ReadNonHtml;
          if (!DiscardReadAheadBufferInCurrentPass())
          {
            // Current char must be re-parsed.
            return i;
          }
          goto case State.ReadNonHtml;
        }

        AppendReadAheadBuffer(p);
        if (_scopeDataStart.Success)
        {
          _scopeDataStart.Reset();
          _skipTestSequence = CommentEndTest;
          _state = State.ReadScopeData;
          if (++i < length)
          {
            p = *++pp;
            goto case State.ReadScopeData;
          }

          return length;
        }

        if (++i < length)
        {
          p = *++pp;
          goto case State.TryReadScopeDataStart;
        }

        return length;

      case State.ReadScopeData:
        AppendReadAheadBuffer(p);

        if (_skipTestSequence.TestOrReset(p) && _skipTestSequence.Success)
        {
          var prefixLength = CommentStartTest.Length + ScopeDataStartTest.Length + 1; // Also the initial '<' from ReadTagStartOrText.
          var postFixedLength = CommentEndTest.Length;
          var data = _readAheadBuffer
            .GetSpan(prefixLength, _readAheadBuffer.Length - prefixLength - postFixedLength)
            .ToString();
          _readAheadBuffer.Clear();

          ParseScopeDataBlock(data);

          _state = State.ReadTagStartOrText;
          return i + 1;
        }

        if (++i < length)
        {
          p = *++pp;
          goto case State.ReadScopeData;
        }

        return length;

      case State.ReadNonHtml:

        if (_skipTestSequence.TestOrReset(p) && _skipTestSequence.Success)
        {
          _state = State.ReadTagStartOrText;
          if (++i < length)
          {
            p = *++pp;
            goto case State.ReadTagStartOrText;
          }

          return length;
        }

        if (++i < length)
        {
          p = *++pp;
          goto case State.ReadNonHtml;
        }

        return length;

      case State.ReadTagEnd:
        if (p == '>')
        {
          var tagName = _tagName.ToString();
          if (!_selfClosing && !SelfClosingTags.Contains(tagName))
          {
            // We got a <script>, <style> or similar that contains non-HTML content.
            if (NonHtmlTags.TryGetValue(tagName, out var stopper))
            {
              _skipTestSequence = stopper;
              _state = State.ReadNonHtml;
              if (++i < length)
              {
                p = *++pp;
                goto case State.ReadNonHtml;
              }

              return length;
            }

            if (_tagName.IsCloseTag)
            {
              --_parserLevel;
              if (_parserLevel != _skipScopeLevels.Current)
              {
                --_effectiveParserLevel;
              }
              else
              {
                while (_parserLevel == _skipScopeLevels.Current && _skipScopeLevels.Length > 0)
                {
                  _skipScopeLevels.Pop();
                }
              }
            }
            else
            {
              if (_parserLevel != _skipScopeLevels.Current || _skipScopeLevels.Length == 0)
              {
                ++_effectiveParserLevel;
              }
              ++_parserLevel;
            }
          }
          _selfClosing = false; // Reset
          _state = State.ReadTagStartOrText;

          if (++i < length)
          {
            p = *++pp;
            goto case State.ReadTagStartOrText;
          }

          return length;
        }

        if (p == '/')
        {
          _selfClosing = true;
        }

        if (++i < length)
        {
          p = *++pp;
          goto case State.ReadTagEnd;
        }

        return length;
    }

    return length;

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    void EnsureReadAheadBuffer()
    {
      if (_writeSkipCount > _readAheadBuffer.Length)
      {
        _readAheadBuffer.Append('<');
      }
    }
    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    void AppendReadAheadBuffer(char p)
    {
      ++_writeSkipCount;
      _readAheadBuffer.Append(p);
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    void FlushToState(State state)
    {
      FlushReadAheadBuffer();
      _state = state;
    }
    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    void FlushReadAheadBuffer()
    {
      if (_readAheadBuffer.Length > 0)
      {
        _markerBuffer.Append(_readAheadBuffer.GetSpan());
        _readAheadBuffer.Clear();
      }
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    bool DiscardReadAheadBufferInCurrentPass()
    {
      if (_readAheadBuffer.Length == 0)
      {
        _writeSkipCount = 0;
        return true;
      }

      if (i < _readAheadBuffer.Length)
      {
        FlushReadAheadBuffer();
        return false;
      }

      _writeSkipCount = 0;
      _readAheadBuffer.Clear();
      return true;
    }
  }

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  private bool IsHtmlWhitespace(char p) => _atWhitespace = p is <= '\x20' or >= '\x7f' and <= '\x9f';

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  public static bool IsValidTagStart(char p) => p is '/' or '!' || (p | (char)0x20) is >= 'a' and <= 'z';

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  private static char ToLowerCase(char p) => p is >= 'A' and <= 'Z' ? (char)(p + 32) : p;

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  private static bool IsTagEndChar(char p) => p is '/' or '>';
}
