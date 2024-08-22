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

  private bool _invoked;
  private object? _result;

  [ScriptMember("then")]
  public async ValueTask<object?> Then(ScriptObject? fulfilled = null, ScriptObject? rejected = null)
  {
    if (!_invoked)
    {
      try
      {
        _result = await _task;
        _invoked = true;
      }
      catch (Exception ex)
      {
        _result = ex;
      }
    }

    return _result is Exception error
      ? rejected?.InvokeAsFunction(error.Message)
      : fulfilled?.InvokeAsFunction(_result);
  }
}

internal class PromiseLike
{
  public static Func<object?> Wrap(Func<ValueTask<object?>> lambda) => () => lambda().AsPromiseLike();

  public static Func<object?, object?> Wrap(Func<object?, ValueTask<object?>> lambda) =>
    argument => lambda(argument).AsPromiseLike();
}
