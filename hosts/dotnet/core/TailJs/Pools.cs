using System.Collections.Concurrent;
using System.Net;
using System.Net.Http;
using System.Runtime.CompilerServices;
using Microsoft.IO;
using TailJs.IO;
using TailJs.Scripting;

[assembly: InternalsVisibleTo("TailJs.AspNet.Vintage")]

namespace TailJs;

public static class Pools
{
  private static readonly RecyclableMemoryStreamManager MemoryStreams = new();

  private static readonly object DictionaryLock = new();
  private static readonly ConcurrentDictionary<string, SharedHttpClient> Clients = new();

  public static MemoryStream GetStream() => MemoryStreams.GetStream();

  /// <summary>
  /// Reads a stream to a pooled byte array. DO REMEMBER TO DISPOSE IT.
  /// </summary>
  public static async ValueTask<ArrayBuffer<byte>> ToByteArray(
    this Stream stream,
    CancellationToken cancellationToken = default,
    int bufferSize = 65536
  )
  {
    var bytes = new ArrayBuffer<byte>();
    var buffer = BufferPool<byte>.Rent(bufferSize);
    try
    {
      int read;
      while ((read = await stream.ReadAsync(buffer, 0, buffer.Length, cancellationToken)) > 0)
      {
        bytes.Append(buffer, read);
      }

      return bytes;
    }
    finally
    {
      BufferPool<byte>.Return(buffer);
    }
  }

  public static HttpClientLease GetHttpClient(string? id = null, Action<HttpClientHandler>? configure = null)
  {
    id ??= "";
    if (!Evaluate(out var client))
    {
      lock (DictionaryLock)
      {
        if (!Evaluate(out client))
        {
          client?.DisposeWhenFree();
          Clients[id] = client = new SharedHttpClient(configure);
        }
      }
    }

    return client!.AddConsumer();

    bool Evaluate(out SharedHttpClient? client) =>
      // ReSharper disable once InconsistentlySynchronizedField
      Clients.TryGetValue(id, out client)
      && DateTime.UtcNow - client.Created <= TimeSpan.FromMinutes(10);
  }

  #region Nested type: HttpClientLease

  public class HttpClientLease : IDisposable
  {
    private Action? _disposeAction;

    internal HttpClientLease(HttpClient client, Action disposeAction)
    {
      _disposeAction = disposeAction;

      Instance = client;
    }

    public HttpClient Instance { get; }

    #region IDisposable Members

    public void Dispose()
    {
      if (_disposeAction == null)
        return;
      _disposeAction();
      _disposeAction = null;
    }

    #endregion
  }

  #endregion


  #region Nested type: HttpClientPool

  internal class SharedHttpClient
  {
    private long _consumers;

    private bool _disposing;

    internal SharedHttpClient(Action<HttpClientHandler>? configure)
    {
      Created = DateTime.UtcNow;
      var handler = new HttpClientHandler
      {
        ClientCertificateOptions = ClientCertificateOption.Manual,
        ServerCertificateCustomValidationCallback = (_, _, _, _) => true,
        AutomaticDecompression = ~DecompressionMethods.None
      };
      configure?.Invoke(handler);
      Client = new(handler);
    }

    public HttpClient Client { get; }

    public DateTime Created { get; }

    public HttpClientLease AddConsumer()
    {
      Interlocked.Increment(ref _consumers);
      return new HttpClientLease(
        Client,
        () =>
        {
          if (Interlocked.Decrement(ref _consumers) == 0 && _disposing)
          {
            Client.Dispose();
          }
        }
      );
    }

    public void DisposeWhenFree()
    {
      _disposing = true;
      if (Interlocked.Read(ref _consumers) == 0)
      {
        Client.Dispose();
      }
    }
  }

  #endregion
}
