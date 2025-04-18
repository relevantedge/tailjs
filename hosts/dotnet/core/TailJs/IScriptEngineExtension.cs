﻿using Microsoft.ClearScript;
using Microsoft.ClearScript.V8;

namespace TailJs
{
  public interface IScriptEngineExtension : IDisposable
  {
    ValueTask<ScriptObject?> SetupAsync(
      V8ScriptEngine engine,
      IResourceManager resources,
      CancellationToken cancellationToken = default
    );
  }
}
