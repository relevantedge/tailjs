namespace TailJs;

public interface IResourceManager : IDisposable
{
  ValueTask<byte[]?> ReadAsync(
    string path,
    ChangeHandler<byte[]>? changeHandler = null,
    CancellationToken cancellationToken = default
  );

  ValueTask<string?> ReadTextAsync(
    string path,
    ChangeHandler<string>? changeHandler = null,
    CancellationToken cancellationToken = default
  );

  ValueTask<IReadOnlyList<ResourceEntry>> ListAsync(
    string path,
    CancellationToken cancellationToken = default
  );

  ValueTask WriteAsync(string path, byte[] data, CancellationToken cancellationToken = default);

  ValueTask WriteTextAsync(string path, string text, CancellationToken cancellationToken = default);

  ValueTask<bool> DeleteAsync(string path, CancellationToken cancellationToken = default);
}

public record ResourceEntry(
  string Path,
  string Name,
  bool IsDirectory,
  bool IsReadOnly,
  DateTime? Created = null,
  DateTime? Modified = null
);
