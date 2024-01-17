using Microsoft.ClearScript;

// ReSharper disable UnusedMember.Global


namespace TailJs.Scripting;

internal class PromiseLike<T>
{
  private readonly Task<T> _task;

  public PromiseLike(Task<T> task)
  {
    _task = task;
  }

  [ScriptMember("then")]
  public async Task Then(ScriptObject? fulfilled = null, ScriptObject? rejected = null)
  {
    try
    {
      var result = await _task;
      fulfilled?.Invoke(false, result);
    }
    catch (Exception ex)
    {
      rejected?.Invoke(false, ex.Message);
    }
  }
}
