namespace TailJs;

public interface IRequestHandlerPool : IDisposable
{
  public IRequestHandler GetRequestHandler();

  public ValueTask Recycle(CancellationToken cancellationToken = default);
}
