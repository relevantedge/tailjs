using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Primitives;

namespace TailJs;

public interface IMutableFileProvider : IFileProvider
{
  /// <summary>
  /// Tests whether a given path is governed by this <see cref="IMutableFileProvider"/>.
  /// </summary>
  /// <param name="subpath">The path to test.</param>
  /// <returns><c>true</c> if it does; <c>false</c> otherwise</returns>
  bool Matches(string subpath);

  ValueTask WriteAsync(string subpath, byte[] data, CancellationToken cancellationToken = default);

  ValueTask<bool> DeleteAsync(string subpath, CancellationToken cancellationToken = default);
}

public class MutableFileProvider : IMutableFileProvider
{
  private readonly IFileProvider _fileProvider;

  private MutableFileProvider(IFileProvider fileProvider)
  {
    _fileProvider = fileProvider;
  }

  private (string Path, IFileInfo FileInfo) ResolveFileInfo(string subpath)
  {
    var fileInfo = _fileProvider.GetFileInfo(subpath);
    if (fileInfo.PhysicalPath == null)
    {
      throw new InvalidOperationException("The path is not writable.");
    }

    return (fileInfo.PhysicalPath, fileInfo);
  }

  public static IMutableFileProvider AsMutable(IFileProvider fileProvider) =>
    new MutableFileProvider(fileProvider);

  #region IMutableFileProvider Members

  public ValueTask<bool> DeleteAsync(string subpath, CancellationToken cancellationToken = default)
  {
    var (path, entry) = ResolveFileInfo(subpath);
    if (!entry.Exists)
    {
      return new(false);
    }

    if (!entry.IsDirectory)
    {
      throw new InvalidOperationException("The path is not a directory.");
    }

    Directory.Delete(path, true);
    return new(true);
  }

  public IDirectoryContents GetDirectoryContents(string subpath) =>
    _fileProvider.GetDirectoryContents(subpath);

  public IFileInfo GetFileInfo(string subpath) => _fileProvider.GetFileInfo(subpath);

  public bool Matches(string subpath) => true;

  public IChangeToken Watch(string filter) => _fileProvider.Watch(filter);

  public async ValueTask WriteAsync(
    string subpath,
    byte[] data,
    CancellationToken cancellationToken = default
  )
  {
    var (path, entry) = ResolveFileInfo(subpath);

    if (entry.IsDirectory)
    {
      throw new InvalidOperationException("Cannot write to a directory.");
    }

    if (new FileInfo(path) is not { } fileInfo)
    {
      throw new InvalidOperationException("The path could not be resolved to a file path.");
    }

    if (!fileInfo.Directory?.Exists == false)
    {
      Directory.CreateDirectory(fileInfo.Directory!.FullName);
    }
#if NETSTANDARD2_1_OR_GREATER || NET5_0_OR_GREATER
    await File.WriteAllBytesAsync(path, data, cancellationToken);
#else
    File.WriteAllBytes(path, data);
#endif
  }

  #endregion
}
