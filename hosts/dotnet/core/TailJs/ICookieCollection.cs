using System.Diagnostics.CodeAnalysis;

namespace TailJs;

public interface ICookieCollection : IEnumerable<KeyValuePair<string, TrackerCookie>>
{
  TrackerCookie? this[string name] { get; set; }

  bool TryGetCookie<T>(
    string name,
#if NETSTANDARD2_1_OR_GREATER || NET5_0_OR_GREATER
    [MaybeNullWhen(false)]
#endif
    out T cookie
  ) where T : TrackerCookie;
}
