using System.Collections.Concurrent;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Console;
using Microsoft.Extensions.Options;

namespace TailJs.Scripting;

public class ScriptLoggerFactory : IScriptLoggerFactory
{
  private readonly ILoggerFactory? _loggerFactory;

  public ILogger DefaultLogger { get; }

  public ScriptLoggerFactory(ILogger<RequestHandler> defaultLogger, ILoggerFactory? loggerFactory)
  {
    _loggerFactory = loggerFactory;
    DefaultLogger = defaultLogger;
  }

  private readonly ConcurrentDictionary<string, ILogger> _groupLoggers = new();

  public ILogger? GetLogger(string? group)
  {
    if (string.IsNullOrEmpty(group))
      return DefaultLogger;

    if (!_groupLoggers.TryGetValue(group, out var logger) && _loggerFactory != null)
    {
      lock (this)
      {
        if (!_groupLoggers.TryGetValue(group, out logger))
        {
          _groupLoggers.TryAdd(group, logger = _loggerFactory.CreateLogger(group));
        }
      }
    }

    return logger;
  }
}
