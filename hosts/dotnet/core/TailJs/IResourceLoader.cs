namespace TailJs;

public interface IResourceLoader : IDisposable
{
  ValueTask<string?> ReadTextAsync(
    string path,
    ChangeHandler<string>? changeHandler = null,
    CancellationToken cancellationToken = default
  );

  ValueTask<byte[]?> ReadAsync(
    string path,
    ChangeHandler<byte[]>? changeHandler = null,
    CancellationToken cancellationToken = default
  );
}
