using System.Collections;
using System.Diagnostics.CodeAnalysis;
using Microsoft.ClearScript;

namespace TailJs.Scripting;

public class CookieCollection : ICookieCollection
{
  private readonly IScriptObject _collection;

  internal CookieCollection(IScriptObject collection)
  {
    _collection = collection;
  }

  public TrackerCookie? this[string name]
  {
    get => TryGetCookie<TrackerCookie>(name, out var cookie) ? cookie : null;
    set
    {
      if (value == null)
      {
        _collection.DeleteProperty(name);
      }
      else
      {
        _collection[name] = value;
      }
    }
  }

  public bool TryGetCookie<T>(string name,
#if NETSTANDARD2_1_OR_GREATER || NET5_0_OR_GREATER
    [MaybeNullWhen(false)]
#endif
    out T cookie)
    where T : TrackerCookie => (cookie = (T?)TryMapCookie(_collection.GetScriptValue(name))!) != null;

  internal static IReadOnlyList<ClientResponseCookie> MapCookies(object? cookies) =>
    cookies == null
      ? Array.Empty<ClientResponseCookie>()
      : cookies
        .EnumerateScriptValues()
        .Select(cookie =>
          TryMapCookie(cookie.Value) as ClientResponseCookie
          ?? throw new InvalidOperationException("Client cookie expected.")
        )
        .ToList();

  internal static TrackerCookie? TryMapCookie(object? cookieValue)
  {
    if (cookieValue is TrackerCookie clrCookie)
      return clrCookie;

    if (cookieValue is not IScriptObject cookie || cookieValue == Undefined.Value)
      return null;

    var fromRequest = (bool?)cookie.GetScriptValue("fromRequest") ?? false;
    var value = (string)cookie["value"];

    return cookie.GetScriptValue<string>("name") is { } name
      ? new ClientResponseCookie(
        name,
        value,
        cookie.TryGetScriptInteger("maxAge"),
        cookie.RequireScriptValue<bool>("httpOnly"),
        cookie.RequireScriptValue<string>("sameSitePolicy") switch
        {
          "Strict" => SameSitePolicy.Strict,
          "None" => SameSitePolicy.None,
          _ => SameSitePolicy.Lax
        },
        cookie.RequireScriptValue<bool>("essential"),
        cookie.RequireScriptValue<bool>("secure"),
        cookie.RequireScriptValue<string>("headerString")
      )
      : new TrackerCookie(
        value,
        cookie.TryGetScriptInteger("maxAge"),
        (bool?)cookie.GetScriptValue("httpOnly") ?? false,
        ((string?)cookie.GetScriptValue("sameSitePolicy")) switch
        {
          "Strict" => SameSitePolicy.Strict,
          "None" => SameSitePolicy.None,
          _ => SameSitePolicy.Lax
        },
        (bool?)cookie.GetScriptValue("essential") ?? false
      )
      {
        FromRequest = fromRequest,
        OriginalValue = (string?)cookie.GetScriptValue("_originalValue")
      };
  }

  #region IEnumerable<KeyValuePair<string,TrackerCookie>> Members

  public IEnumerator<KeyValuePair<string, TrackerCookie>> GetEnumerator() =>
    _collection
      .PropertyNames.Select(name => new KeyValuePair<string, TrackerCookie?>(
        name,
        TryMapCookie(_collection[name]) ?? throw new InvalidOperationException("Unsupported cookie type.")
      ))
      .Where(kv => kv.Value != null)
      .GetEnumerator()!;

  IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();

  #endregion
}
