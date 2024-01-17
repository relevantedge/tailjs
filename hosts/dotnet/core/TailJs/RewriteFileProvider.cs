using System.Text.RegularExpressions;

using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Primitives;

namespace TailJs;

public class RewriteFileProvider : IFileProvider
{
  private readonly Func<string, string?> _map;
  private readonly IFileProvider _inner;

  public RewriteFileProvider(Func<string, string?> map, IFileProvider inner)
  {
    _map = map;
    _inner = inner;
  }

  public IFileInfo GetFileInfo(string subpath) =>
    _map(subpath) is { } path ? _inner.GetFileInfo(path) : new NotFoundFileInfo(subpath);

  public IDirectoryContents GetDirectoryContents(string subpath) =>
    _map(subpath) is { } path ? _inner.GetDirectoryContents(path) : NotFoundDirectoryContents.Singleton;

  public IChangeToken Watch(string filter) =>
    _map(filter) is { } mappedFilter ? _inner.Watch(mappedFilter) : NullChangeToken.Singleton;

  public static IFileProvider FromPrefix(string? prefix, IFileProvider inner)
  {
    if (string.IsNullOrEmpty(prefix) || prefix == "/")
      return inner;

    prefix = string.Concat(Regex.Replace(prefix, @"^\?/(.*)\/?$", "$1"), "/");
    return new RewriteFileProvider(path => string.Concat(prefix, path), inner);
  }
}
