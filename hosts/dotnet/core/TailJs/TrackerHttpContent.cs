using Microsoft.ClearScript.JavaScript;

using TailJs.Scripting;

namespace TailJs;

public record TrackerHttpContent(string? String = null, byte[]? Binary = null)
{
  internal object? Map(Uint8ArrayConverter converter) =>
    String ?? (Binary != null ? (object?)converter.FromBytes(Binary) : null);

  internal static TrackerHttpContent Unmap(object? value) =>
    new(value as string, (value as ITypedArray<byte>)?.GetBytes());

  public static implicit operator TrackerHttpContent?(string? value) =>
    value == null ? null : new(String: value);

  public static implicit operator TrackerHttpContent?(byte[]? value) =>
    value == null ? null : new(Binary: value);
}
