using System.Collections.Concurrent;
using System.Text;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging;
using TailJs.Scripting;

namespace TailJs;

public delegate ValueTask<bool> ChangeHandler<T>(string path, Func<CancellationToken, ValueTask<T?>> read);

public class ResourceManager : IResourceManager
{
  #region Delegates

  public delegate ValueTask<bool> ChangeFilter(string path);

  #endregion


  private readonly IFileProvider[] _fileProviders;
  private readonly ChangeFilter? _changeFilter;
  private readonly ILogger? _logger;

  private bool _disposed;

  private readonly ConcurrentDictionary<
    string,
    (IFileProvider Provider, IDisposable Handle, ConcurrentBag<ChangeHandler<byte[]>> Handlers)
  > _changeHandlers = new();

  public ResourceManager(
    // A single CompositeFileProvider does not allow creating watchers at the individual file provider level, hence a list
    IEnumerable<IFileProvider> fileProviders,
    ChangeFilter? changeFilter = null,
    ILogger? logger = null
  )
  {
    _fileProviders = fileProviders.ToArray();
    _changeFilter = changeFilter;
    _logger = logger;
  }

  private IMutableFileProvider? FindMutableFileProvider(string path, bool require = true)
  {
    var fileProvider = _fileProviders
      .OfType<IMutableFileProvider>()
      .FirstOrDefault(provider => provider.Matches(path));
    if (fileProvider == null && require)
    {
      throw new InvalidOperationException($"No mutable file provider matches the path '{path}'.");
    }

    return fileProvider;
  }

  private void ResourceChanged(string path)
  {
    Task.Run(Fire).ConfigureAwait(false);
    return;

    async Task Fire()
    {
      try
      {
        if (_changeHandlers.TryRemove(path, out var entry))
        {
          async ValueTask<byte[]?> ReadFileAsync(CancellationToken cancellationToken) =>
            entry.Provider.GetFileInfo(path) is { Exists: true } file
              ? await file.CreateReadStream().ReadAsBytesAsync(true, cancellationToken).ConfigureAwait(false)
              : null;

          entry.Handle.Dispose();
          var cancel = _changeFilter != null && !await _changeFilter(path).ConfigureAwait(false);
          if (cancel)
          {
            return;
          }

          foreach (var handler in entry.Handlers)
          {
            try
            {
              if (await handler(path, ReadFileAsync).ConfigureAwait(false))
              {
                RegisterChangeHandler(entry.Provider, path, handler);
              }
            }
            catch (Exception ex)
            {
              _logger?.LogError(ex, "A change handler threw an exception.");
            }
          }
        }
      }
      catch
      {
        // Don't crash a background thread even if logging or something weird crashed.
      }
    }
  }

  private void RegisterChangeHandler(IFileProvider provider, string path, ChangeHandler<byte[]>? action)
  {
    var changeToken = provider.Watch(path);
    var entry = _changeHandlers.GetOrAdd(
      path,
      _ =>
        (
          provider,
          changeToken.RegisterChangeCallback(
            _ =>
            {
              if (changeToken.HasChanged)
              {
                ResourceChanged(path);
              }
            },
            this
          ),
          new()
        )
    );
    if (action != null)
    {
      entry.Handlers.Add(action);
    }
  }

  #region IResourceManager Members

  public ValueTask<bool> DeleteAsync(string path, CancellationToken cancellationToken = default) =>
    FindMutableFileProvider(path)!.DeleteAsync(path, cancellationToken);

  public void Dispose()
  {
    if (_disposed == (_disposed = true))
    {
      return;
    }

    foreach (var entry in _changeHandlers.Values)
    {
      entry.Handle.Dispose();
    }
  }

  public ValueTask<IReadOnlyList<ResourceEntry>> ListAsync(
    string path,
    CancellationToken cancellationToken = default
  )
  {
    var (provider, directory) = _fileProviders
      .Select(provider => (provider, provider.GetFileInfo(path)))
      .FirstOrDefault(item => item.Item2.Exists && item.Item2.IsDirectory);

    if (directory == null)
      return new(Array.Empty<ResourceEntry>());

    var entries = provider.GetDirectoryContents(path);

    return new(
      entries
        .Select(entry => new ResourceEntry(
          Path.Combine(path, entry.Name),
          entry.Name,
          entry.IsDirectory,
          entry.PhysicalPath == null,
          null,
          entry.LastModified.UtcDateTime
        ))
        .ToList()
    );
  }

  public async ValueTask<byte[]?> ReadAsync(
    string path,
    ChangeHandler<byte[]>? changeHandler = null,
    CancellationToken cancellationToken = default
  )
  {
    var (provider, file) = _fileProviders
      .Select(provider => (provider, provider.GetFileInfo(path)))
      .FirstOrDefault(item => item.Item2.Exists);

    if (file == null)
      return null;

    RegisterChangeHandler(provider, path, changeHandler);

    return await file.CreateReadStream().ReadAsBytesAsync(true, cancellationToken).ConfigureAwait(false);
  }

  public async ValueTask<string?> ReadTextAsync(
    string path,
    ChangeHandler<string>? changeHandler = null,
    CancellationToken cancellationToken = default
  ) =>
    await ReadAsync(
        path,
        changeHandler == null
          ? null
          : async (path, data) =>
            await changeHandler(
                path,
                async cancellationToken =>
                  await data(cancellationToken).ConfigureAwait(false) is { } resultBytes
                    ? Encoding.UTF8.GetString(resultBytes)
                    : null
              )
              .ConfigureAwait(false),
        cancellationToken
      )
      .ConfigureAwait(false)
      is { } bytes
      ? Encoding.UTF8.GetString(bytes)
      : null;

  public async ValueTask WriteAsync(string path, byte[] data, CancellationToken cancellationToken = default)
  {
    await FindMutableFileProvider(path)!.WriteAsync(path, data, cancellationToken);
  }

  public ValueTask WriteTextAsync(string path, string text, CancellationToken cancellationToken = default) =>
    WriteAsync(path, Encoding.UTF8.GetBytes(text), cancellationToken);

  #endregion
}
