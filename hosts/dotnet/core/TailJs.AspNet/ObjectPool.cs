using System.Collections.Concurrent;


namespace TailJs.AspNet;

public class ObjectPool<T> : IDisposable
{
  private readonly Func<long, T> _generator;
  private readonly Action<T>? _initializer;
  private readonly Action<T>? _cleaner;
  private readonly int _maxCount;
  private readonly ConcurrentBag<T> _objects = new();

  public ObjectPool(
    Func<long, T> generator,
    Action<T>? initializer = null,
    Action<T>? cleaner = null,
    int maxCount = int.MaxValue
  )
  {
    _generator = generator;
    _initializer = initializer;
    _cleaner = cleaner;
    _maxCount = maxCount;
  }

  private long _currentId = -1;

  public ObjectLease<T> Rent()
  {
    if (_maxCount > 0 && _objects.TryTake(out var pooled))
    {
      _initializer?.Invoke(pooled);
    }
    else
    {
      pooled = _generator(Interlocked.Increment(ref _currentId));
    }
    return new ObjectLease<T>(this, pooled);
  }

  internal void Return(T item)
  {
    if (_objects.Count < _maxCount)
    {
      _objects.Add(item);
      return;
    }

    _cleaner?.Invoke(item);
  }

  public void Dispose()
  {
    while (_objects.TryTake(out var pooled))
    {
      _cleaner?.Invoke(pooled);
    }
  }
}

public class ObjectLease<T> : IDisposable
{
  private readonly ObjectPool<T> _source;

  public T Item { get; }

  public ObjectLease(ObjectPool<T> source, T item)
  {
    _source = source;
    Item = item;
  }

  public void Dispose()
  {
    _source.Return(Item);
  }
}
