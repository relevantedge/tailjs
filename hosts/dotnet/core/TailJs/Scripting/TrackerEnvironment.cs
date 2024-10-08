﻿using System.Text.Json;
using Microsoft.ClearScript;

namespace TailJs.Scripting;

internal class TrackerEnvironment : ITrackerEnvironment
{
  private readonly ScriptObject _proxy;
  private readonly Uint8ArrayConverter _uint8ArrayConverter;
  private readonly IResourceManager _resources;

  public TrackerEnvironment(
    ScriptObject proxy,
    IResourceManager resources,
    Uint8ArrayConverter uint8ArrayConverter,
    IScriptObject handle
  )
  {
    _proxy = proxy;
    _resources = resources;
    _uint8ArrayConverter = uint8ArrayConverter;

    Handle = handle;

    handle.Attach(this);
  }

  public IScriptObject Handle { get; }

  #region ITrackerEnvironment Members

  public long? HashNumber(object? value, bool secure = false) =>
    _proxy.InvokeMethod("hash", value, secure, true).GetScriptValue<long?>();

  public string? HashString(object? value, bool secure = false) =>
    _proxy.InvokeMethod("hash", value, secure, false).GetScriptValue<string?>();

  public T? HttpDecode<T>(string? value) =>
    _proxy.InvokeMethod("httpDecode", value).GetScriptValue<string?>() is { } json
      ? JsonSerializer.Deserialize<T>(json)
      : default;

  public T? HttpDecrypt<T>(string value) =>
    _proxy.InvokeMethod("httpDecrypt", value).GetScriptValue<string?>() is { } json
      ? JsonSerializer.Deserialize<T>(json)
      : default;

  public string HttpEncode(string json) => _proxy.InvokeMethod("httpEncode", json).GetScriptValue<string>();

  public string HttpEncrypt(string json) => _proxy.InvokeMethod("httpEncrypt", json).GetScriptValue<string>();

  public void Log(LogMessage message)
  {
    _proxy.InvokeMethod("log", message);
  }

  public async ValueTask<string> NextIdAsync(string scope, CancellationToken cancellationToken = default) =>
    (await _proxy.InvokeMethod("nextId").AwaitScript(cancellationToken)).GetScriptValue<string>();

  public ValueTask<byte[]?> ReadAsync(
    string path,
    ChangeHandler<byte[]>? changeHandler = null,
    CancellationToken cancellationToken = default
  ) => _resources.ReadAsync(path, changeHandler, cancellationToken);

  public ValueTask<string?> ReadTextAsync(
    string path,
    ChangeHandler<string>? changeHandler = null,
    CancellationToken cancellationToken = default
  ) => _resources.ReadTextAsync(path, changeHandler, cancellationToken);

  public async ValueTask<TrackerHttpResponse> RequestAsync(
    TrackerHttpRequest request,
    CancellationToken cancellationToken = default
  )
  {
    var response = await _proxy
      .InvokeMethod("forwardRequest", request.Map(_uint8ArrayConverter))
      .AwaitScript(cancellationToken)
      .ConfigureAwait(false);

    return TrackerHttpResponse.FromScriptObject(response);
  }

  #endregion
}
