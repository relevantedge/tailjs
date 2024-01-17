using System.Buffers;
using System.Runtime.CompilerServices;

namespace TailJs.IO;

internal readonly struct BufferPool<T>
{
  private const int GrowFactor = 128;

  private static readonly ArrayPool<T> Pool = ArrayPool<T>.Shared;

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  public static void EnsureCapacity(ref T[] buffer, int size)
  {
    if (buffer.Length > size)
    {
      return;
    }
    var targetSize = GrowFactor * ((size + GrowFactor - 1) / GrowFactor);
    var previousBuffer = buffer;
    buffer = Pool.Rent(targetSize);
    Array.Copy(previousBuffer, buffer, previousBuffer.Length);
    Pool.Return(previousBuffer);
  }

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  public static void Dispose(T[] buffer) => Pool.Return(buffer);
}
