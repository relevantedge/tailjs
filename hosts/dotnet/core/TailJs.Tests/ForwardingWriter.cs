using System.Text;

namespace TailJs.Tests;

public class ForwardingWriter : TextWriter
{
  private readonly TextWriter _target;

  public ForwardingWriter(TextWriter target)
  {
    _target = target;
  }

  public override Encoding Encoding => _target.Encoding;

  public override void Write(char value) => _target.Write(value);

  public override void Write(string? value) => _target.Write(value);

  public override void Write(StringBuilder? value) => _target.Write(value);

  public override void Write(ReadOnlySpan<char> buffer) => _target.Write(buffer);

  public override void Write(char[] buffer, int index, int count) => _target.Write(buffer, index, count);

  public override void Write(char[]? buffer) => _target.Write(buffer);

  public override Task WriteAsync(string? value) => _target.WriteAsync(value);

  public override Task WriteAsync(
    ReadOnlyMemory<char> buffer,
    CancellationToken cancellationToken = default
  ) => _target.WriteAsync(buffer, cancellationToken);

  public override Task WriteAsync(StringBuilder? value, CancellationToken cancellationToken = default) =>
    _target.WriteAsync(value, cancellationToken);

  public override Task WriteAsync(char[] buffer, int index, int count) =>
    _target.WriteAsync(buffer, index, count);

  public override Task WriteAsync(char value) => _target.WriteAsync(value);
}
