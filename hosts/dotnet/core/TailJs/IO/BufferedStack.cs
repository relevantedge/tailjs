using System.Collections;
using System.Diagnostics;
using System.Runtime.CompilerServices;

namespace TailJs.IO;

[DebuggerDisplay("BufferedStack({Length})")]
internal struct BufferedStack<T> : IReadOnlyCollection<T>, IDisposable
  where T : notnull
{
  private readonly T? _defaultValue;
  private T[] _buffer;

  public BufferedStack()
    : this(default) { }

  public BufferedStack(T? defaultValue)
  {
    _defaultValue = defaultValue;
    _buffer = Array.Empty<T>();
  }

  public T? Current => Length == 0 ? _defaultValue : _buffer[Length - 1];

  public int Length { get; private set; }

  public Span<T> GetSpan() => _buffer.AsSpan(0, Length);

  public bool HasSameBuffer(BufferedStack<T> other) => _buffer == other._buffer;

  public bool Any(T value, int start = 0)
  {
    var i = 0;
    while (i < Length && !Equals(_buffer[i++], value)) { }

    return i < Length;
  }

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  public void Push(T value)
  {
    BufferPool<T>.EnsureCapacity(ref _buffer, ++Length);
    _buffer[Length - 1] = value;
  }

  public T Pop(int count = 1)
  {
    if (count <= 0)
      throw new ArgumentException("Positive number expected.", nameof(count));

    if (Length <= count - 1)
      throw new InvalidOperationException("Stack is empty.");
    Length -= count;
    return _buffer[Length];
  }

  public void Clear()
  {
    Length = 0;
  }

  #region IDisposable Members

  public void Dispose()
  {
    if (_buffer == null)
    {
      return;
    }

    BufferPool<T>.Return(_buffer);

    _buffer = null!;
  }

  #endregion


  #region IReadOnlyCollection<T> Members

  public int Count => Length;

  public IEnumerator<T> GetEnumerator() =>
    ((IEnumerable<T>)new ArraySegment<T>(_buffer, 0, Length)).GetEnumerator();

  IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();

  #endregion
}
