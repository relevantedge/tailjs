using Microsoft.Extensions.Logging;

namespace TailJs.Scripting;

public interface IScriptLoggerFactory
{
  ILogger DefaultLogger { get; }

  ILogger? GetLogger(string? group);
}
