using System.Diagnostics;
using System.Runtime.CompilerServices;

namespace TailJs.IO;

[DebuggerDisplay("{Debug}")]
public record CharBuffer : IDisposable
{
  private char[] _buffer;

  public CharBuffer()
  {
    _buffer = Array.Empty<char>();
  }

  public int Length { get; private set; }

  public char this[int index] => index >= Length ? default : _buffer[index];

  private string Debug => ToString();

  public ReadOnlySpan<char> GetSpan() => _buffer.AsSpan(0, Length);

  public ReadOnlySpan<char> GetSpan(int start, int length) => _buffer.AsSpan(start, length);

  public ReadOnlyMemory<char> GetMemory() => _buffer.AsMemory(0, Length);

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  public void Append(char p)
  {
    BufferPool<char>.EnsureCapacity(ref _buffer, ++Length);
    _buffer[Length - 1] = p;
  }

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  public void Append(ReadOnlySpan<char> span)
  {
    BufferPool<char>.EnsureCapacity(ref _buffer, Length += span.Length);
    span.CopyTo(_buffer.AsSpan(Length - span.Length));
  }

  public bool Equals(ReadOnlySpan<char> other)
  {
    if (Length != other.Length)
    {
      return false;
    }
    var buffer = GetSpan();
    var i = 0;
    while (i < buffer.Length && buffer[i] == other[i++]) { }

    return i == Length;
  }

  public void Append(string text) => Append(text.AsSpan());

  public void Clear() => Length = 0;

  public void Reset()
  {
    BufferPool<char>.Return(_buffer);
    _buffer = Array.Empty<char>();

    Length = 0;
  }

  public override string ToString() => new(_buffer, 0, Length);

  #region IDisposable Members

  public void Dispose()
  {
    BufferPool<char>.Return(_buffer);
  }

  #endregion
}
