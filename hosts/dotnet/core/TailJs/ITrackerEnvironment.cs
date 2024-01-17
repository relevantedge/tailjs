using TailJs.Scripting;

namespace TailJs;

/// <summary>
/// Stub. .NET to JS extensions not yet implemented.
/// </summary>
public interface ITrackerEnvironment
{
  void Log(LogMessage message);

  string HttpEncrypt(string json);

  string HttpEncode(string json);

  T? HttpDecrypt<T>(string value);

  T? HttpDecode<T>(string? value);

  string? HashString(object? value, bool secure = false);

  long? HashNumber(object? value, bool secure = false);

  ValueTask<string> NextIdAsync(string scope, CancellationToken cancellationToken = default);

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

  /// <summary>
  /// Request proxy for the tracker engine.
  /// </summary>
  /// <param name="request">The request coming from the engine.</param>
  /// <param name="cancellationToken">The cancellation token to cancel the operation.</param>
  /// <returns>The response to be passed back to the engine.</returns>
  ValueTask<TrackerHttpResponse> RequestAsync(
    TrackerHttpRequest request,
    CancellationToken cancellationToken = default
  );
}
