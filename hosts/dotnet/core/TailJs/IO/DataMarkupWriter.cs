// Struct fields are not readonly. Otherwise they'll be copy-on-read, which is slightly slower.
// ReSharper disable FieldCanBeMadeReadOnly.Local

using System.Runtime.CompilerServices;

namespace TailJs.IO;

public partial class DataMarkupWriter : IAsyncDisposable
{
  public delegate string? EndOfBodyContent(IEnumerable<string>? referencedValues);

  private readonly char[] _attributeName;
  private readonly bool _writeTextMarkers;
  private readonly bool _ignoreScopeData;
  private readonly EndOfBodyContent? _injectAtEndOfBody;
  private readonly bool _skipHtmlScope;
  private readonly Dictionary<string, int>? _valueReferences;

  private CharBuffer _markerBuffer = new();
  private CharBuffer _attributeValue = new();

  public DataMarkupWriter() : this(new()) { }

  public DataMarkupWriter(DataMarkupWriterSettings settings)
  {
    _attributeName = settings.AttributeName.ToArray();
    _writeTextMarkers = settings.WriteTextMarkers;
    _ignoreScopeData = settings.IgnoreScopeData;
    _injectAtEndOfBody = settings.EndOfBodyContent;
    _skipHtmlScope = settings.IgnoreHtmlScope;
    JsonSerializerOptions = settings.JsonSerializerOptions;

    if (settings.UseReferences)
    {
      _valueReferences = new();
    }
  }

  private BufferedStack<TextWriter> _targetWriters = new();

  public int TargetWriterCount => _targetWriters.Length;

  /// <summary>
  /// Indicates whether Dispose is ignored. Used for scenarios where an underlying pool manages instances.
  /// </summary>
  public bool KeepAlive { get; set; }

  public DataMarkupWriter PushWriter(TextWriter writer)
  {
    _targetWriters.Push(writer);
    return this;
  }

  public TextWriter PopWriter()
  {
    var currentWriter = _targetWriters.Current;

    if (currentWriter == null)
    {
      throw new InvalidOperationException("No current writer.");
    }

    _targetWriters.Pop();
    return currentWriter;
  }

  public IEnumerable<string>? GetValueReferences() =>
    _valueReferences?.OrderBy(kv => kv.Value).Select(kv => kv.Key);

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  private void AppendTextMarker(bool keepCurrent = false)
  {
    if (!_writeTextMarkers)
    {
      return;
    }

    _markerBuffer.Append("<wbr");
    if (HasAttributeValue() || keepCurrent)
    {
      AppendAttributeValue(
        includeName: true,
        includeAssignment: true,
        writeQuotes: true,
        quoteChar: _scope.PendingAttributeQuote,
        prefix: ' ',
        keepCurrent
      );
    }

    _markerBuffer.Append('>');
  }

  private bool AppendAttributeValue(
    bool includeName,
    bool includeAssignment,
    bool writeQuotes,
    char quoteChar,
    char prefix,
    bool keepCurrent
  )
  {
    var hasValue = BuildAttributeValue(quoteChar, keepCurrent);
    if (hasValue)
    {
      if (prefix != default)
      {
        _markerBuffer.Append(prefix);
      }
      if (includeName)
      {
        _markerBuffer.Append(_attributeName);
      }

      if (_attributeValue.Length > 0 || prefix == Separator)
      {
        if (includeAssignment)
        {
          _markerBuffer.Append('=');
        }

        if (writeQuotes && quoteChar != default)
        {
          _markerBuffer.Append(quoteChar);
        }

        _markerBuffer.Append(_attributeValue.GetSpan());
        if (writeQuotes && quoteChar != default)
        {
          _markerBuffer.Append(quoteChar);
        }
      }
    }
    _elementHasAttribute = true;
    ++_scope.MarkersWritten;
    return hasValue;
  }

  #region Internal write

  // Used to make sure that we don't get a stack overflow if the current target writer wraps an inner writer that includes this.
  private int _recursiveWrites;

  private unsafe void WriteUnsafe(char* start, int length)
  {
    try
    {
      if (_recursiveWrites++ > 0)
      {
        WriteToInner(new ReadOnlySpan<char>(start, length));
        return;
      }

      while (length > 0)
      {
        var count = Take(start, length);
        if (count > 0)
        {
          WriteToInner(new ReadOnlySpan<char>(start, count - _writeSkipCount));
          length -= count;
          start += count;
        }

        FlushBuffer();
      }
    }
    finally
    {
      --_recursiveWrites;
    }
  }

  private async Task WriteUnsafeAsync(
    ReadOnlyMemory<char> buffer,
    CancellationToken cancellationToken = default
  )
  {
    try
    {
      if (_recursiveWrites++ > 0)
      {
        await WriteToInnerAsync(buffer, cancellationToken);
        return;
      }

      while (buffer.Length > 0)
      {
        var count = TakeNonAsync();
        if (count > 0)
        {
          await WriteToInnerAsync(buffer.Slice(0, count - _writeSkipCount), cancellationToken)
            .ConfigureAwait(false);
          buffer = buffer.Slice(count);
        }

        await FlushBufferAsync(cancellationToken).ConfigureAwait(false);
      }

      int TakeNonAsync() => Take(buffer.Span);
    }
    finally
    {
      --_recursiveWrites;
    }
  }

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  private TextWriter? GetTargetWriterInWriteScope() =>
    _recursiveWrites == 1
      ? _targetWriters.Current
      : _recursiveWrites > _targetWriters.Length
        ? throw new InvalidOperationException("Write recursion depth exceeds the stack of writer.")
        : _targetWriters.GetSpan()[_targetWriters.Length - _recursiveWrites];

  private void WriteToInner(ReadOnlySpan<char> text)
  {
    var targetWriter = GetTargetWriterInWriteScope();

#if NETSTANDARD2_1_OR_GREATER || NET5_0_OR_GREATER
    targetWriter?.Write(text);
#else
    targetWriter?.Write(text.ToArray());
#endif
  }

  private async Task WriteToInnerAsync(
    ReadOnlyMemory<char> buffer,
    CancellationToken cancellationToken = default
  )
  {
    var targetWriter = GetTargetWriterInWriteScope();

    if (targetWriter == null)
    {
      return;
    }

#if NETSTANDARD2_1_OR_GREATER || NET5_0_OR_GREATER
    await targetWriter.WriteAsync(buffer, cancellationToken).ConfigureAwait(false);
#else
    await targetWriter.WriteAsync(buffer.ToArray()).ConfigureAwait(false);
#endif
  }

  private void FlushBuffer()
  {
    if (_markerBuffer.Length > 0)
    {
      WriteToInner(_markerBuffer.GetSpan());
      _markerBuffer.Clear();
    }
  }

  private async ValueTask FlushBufferAsync(CancellationToken cancellationToken = default)
  {
    if (_markerBuffer.Length > 0)
    {
      await WriteToInnerAsync(_markerBuffer.GetMemory(), cancellationToken).ConfigureAwait(false);
      _markerBuffer.Clear();
    }
  }

  #endregion

  public void EndWrite()
  {
    if (_writeSkipCount == 0)
    {
      return;
    }

    // If we have buffered ahead but not used it, flush it.
    if (_readAheadBuffer.Length > 0)
    {
      ++_recursiveWrites;
      try
      {
        WriteToInner(_readAheadBuffer.GetSpan());
      }
      finally
      {
        --_recursiveWrites;
      }
    }
  }

  public async ValueTask EndWriteAsync(CancellationToken cancellationToken = default)
  {
    if (_writeSkipCount == 0)
    {
      return;
    }
    if (_readAheadBuffer.Length > 0)
    {
      ++_recursiveWrites;
      try
      {
        await WriteToInnerAsync(_readAheadBuffer.GetMemory(), cancellationToken);
      }
      finally
      {
        --_recursiveWrites;
      }
    }
  }

  /// <summary>
  /// This method can be used when writers are pooled.
  /// It resets all variables to initial state.
  /// </summary>
  /// <param name="newWriter"></param>
  public void Reset(TextWriter? newWriter = null)
  {
    ThrowIfDisposed();

    // From this file
    _markerBuffer.Clear();
    _attributeValue.Clear();
    _valueReferences?.Clear();
    _targetWriters.Clear();
    if (newWriter != null)
    {
      _targetWriters.Push(newWriter);
    }

    // From Parse
    _state = State.ReadTagStartOrText;
    _skipTestSequence = SequenceTester.None;
    _tagName.Reset();
    _currentAttributeQuote = default;
    _elementHasAttribute = false;
    _selfClosing = false;
    _readAttributeValue = false;
    _parserLevel = 0;
    _effectiveParserLevel = 0;
    _writeSkipCount = 0;
    _readAheadBuffer.Clear();
    _endOfBody = EndOfBodyTest;
    _scopeDataStart = ScopeDataStartTest;

    // From Scope
    ClearScopes();
    _scope = new();
    _scopeEndedLevel = int.MinValue;
    _skipScopeLevels.Clear();
  }

  #region Dispose

  private bool _disposed;

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  private void ThrowIfDisposed()
  {
    if (_disposed)
    {
      throw new ObjectDisposedException(nameof(DataMarkupWriter));
    }
  }

  private bool DisposeBuffers()
  {
    if (_disposed == (_disposed = true))
    {
      return false;
    }
    _markerBuffer.Dispose();
    _attributeValue.Dispose();
    ClearScopes();
    _scopes.Dispose();
    _skipScopeLevels.Dispose();
    _readAheadBuffer.Dispose();
    _scopeDataItems.Dispose();

    return true;
  }

  protected override void Dispose(bool disposing)
  {
    if (KeepAlive)
      return;
    if (DisposeBuffers())
    {
      EndWrite();
    }
  }

#if NETSTANDARD2_1_OR_GREATER || NET5_0_OR_GREATER
  public override ValueTask DisposeAsync() => DisposeAsync(default);
#else
  public ValueTask DisposeAsync() => DisposeAsync(default);
#endif

  public ValueTask DisposeAsync(CancellationToken cancellationToken) =>
    !KeepAlive && DisposeBuffers() ? EndWriteAsync(cancellationToken) : default;

  #endregion
}
