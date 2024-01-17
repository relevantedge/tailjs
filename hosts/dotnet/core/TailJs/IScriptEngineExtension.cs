using Microsoft.ClearScript;
using Microsoft.ClearScript.V8;

namespace TailJs
{
  public interface IScriptEngineExtension : IDisposable
  {
    ValueTask<ScriptObject?> SetupAsync(
      V8ScriptEngine engine,
      IResourceLoader resources,
      CancellationToken cancellationToken = default
    );
  }
}
