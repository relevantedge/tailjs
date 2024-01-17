using System.Globalization;
using System.Text;

namespace TailJs.IO;

public partial class DataMarkupWriter : TextWriter
{
  private readonly char[] _single = { '\x00' };

  public override IFormatProvider FormatProvider =>
    _targetWriters.Current?.FormatProvider ?? CultureInfo.CurrentCulture;

  public override string NewLine => _targetWriters.Current?.NewLine ?? Environment.NewLine;

  public override Encoding Encoding => _targetWriters.Current?.Encoding ?? Encoding.UTF8;

  public override Task WriteAsync(char[] buffer, int index, int count) =>
    WriteUnsafeAsync(buffer.AsMemory(index, count));

  public override Task WriteAsync(char p)
  {
    _single[0] = p;
    return WriteUnsafeAsync(_single);
  }

  public override Task WriteAsync(string? value) => WriteUnsafeAsync(value.AsMemory());

  public override Task FlushAsync() => _targetWriters.Current?.FlushAsync() ?? Task.CompletedTask;

  public override unsafe void Write(string? value)
  {
    if (value == null)
    {
      _targetWriters.Current?.Write(value);
      return;
    }
    fixed (char* start = value)
    {
      WriteUnsafe(start, value.Length);
    }
  }

  public override unsafe void Write(char[]? buffer, int index, int count)
  {
    if (buffer == null) // Why not. Could be from somewhere without null checks.
    {
      _targetWriters.Current?.Write(buffer);
      return;
    }
    if (index < 0 || (index + count) > buffer.Length)
    {
      throw new ArgumentOutOfRangeException();
    }

    fixed (char* start = buffer)
    {
      WriteUnsafe(start + index, count);
    }
  }

  public override void Write(char[]? buffer) => Write(buffer, 0, buffer?.Length ?? 0);

  public override unsafe void Write(char value) => WriteUnsafe(&value, 1);

  public override void Flush() => _targetWriters.Current?.Flush();

#if NETSTANDARD2_1_OR_GREATER || NET5_0_OR_GREATER

  public override Task WriteAsync(
    ReadOnlyMemory<char> buffer,
    CancellationToken cancellationToken = default
  ) => WriteUnsafeAsync(buffer.ToArray(), cancellationToken);

  public override unsafe void Write(ReadOnlySpan<char> buffer)
  {
    fixed (char* start = buffer)
    {
      WriteUnsafe(start, buffer.Length);
    }
  }

#endif
#if NET5_0_OR_GREATER
  public override async Task WriteAsync(StringBuilder? value, CancellationToken cancellationToken = default)
  {
    if (value == null)
    {
      if (_targetWriters.Current != null)
      {
        await _targetWriters.Current.WriteAsync(value, cancellationToken);
      }

      return;
    }
    foreach (var chunk in value.GetChunks())
    {
      await WriteUnsafeAsync(chunk, cancellationToken).ConfigureAwait(false);
    }
  }

  public override unsafe void Write(StringBuilder? value)
  {
    if (value == null)
    {
      _targetWriters.Current?.Write(value);

      return;
    }
    foreach (var chunk in value.GetChunks())
    {
      fixed (char* start = chunk.Span)
      {
        WriteUnsafe(start, chunk.Length);
      }
    }
  }
#endif
}
