using System.Buffers;
using System.Runtime.CompilerServices;

namespace TailJs.IO;

internal readonly struct BufferPool<T>
{
  public const int GrowFactor = 128;

  private static readonly ArrayPool<T> Pool = ArrayPool<T>.Shared;

  public static T[] Rent(int size) => Pool.Rent(GrowFactor * ((size + GrowFactor - 1) / GrowFactor));

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  public static void EnsureCapacity(ref T[] buffer, int size, int growFactor = GrowFactor)
  {
    if (buffer.Length > size)
    {
      return;
    }
    var targetSize = growFactor * ((size + growFactor - 1) / growFactor);
    var previousBuffer = buffer;
    buffer = Pool.Rent(targetSize);
    if (previousBuffer.Length > 0)
    {
      Array.Copy(previousBuffer, buffer, previousBuffer.Length);
      Pool.Return(previousBuffer);
    }
  }

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  public static void Return(T[] buffer) => Pool.Return(buffer);
}

public class ArrayBuffer<T> : IDisposable
{
  private T[]? _buffer;

  private int _length;

  public ArraySegment<T> Buffer =>
    new(_buffer ?? throw new ObjectDisposedException(GetType().Name), 0, _length);

  public ArrayBuffer(int initialSize = 0)
  {
    _buffer = initialSize == 0 ? Array.Empty<T>() : BufferPool<T>.Rent(initialSize);
  }

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  public void Append(byte[] buffer, int count = -1, int growFactor = BufferPool<T>.GrowFactor)
  {
    if (_buffer == null)
    {
      throw new ObjectDisposedException(GetType().Name);
    }

    BufferPool<T>.EnsureCapacity(ref _buffer, _length += buffer.Length, growFactor);
    Array.Copy(buffer, 0, _buffer, _length - buffer.Length, count < 0 ? buffer.Length : count);
  }

  public void Dispose()
  {
    if (_buffer == null)
    {
      return;
    }

    if (_buffer.Length > 0)
    {
      BufferPool<T>.Return(_buffer);
    }
    _buffer = null;
  }
}
