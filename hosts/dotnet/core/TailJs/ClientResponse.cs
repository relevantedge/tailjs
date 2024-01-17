namespace TailJs;

public class ClientResponse
{
  public ClientResponse(
    int httpStatus,
    byte[]? body,
    IReadOnlyDictionary<string, string> headers,
    IReadOnlyList<ClientResponseCookie> cookies,
    string? cacheKey,
    string? error
  )
  {
    Headers = headers;
    HttpStatus = httpStatus;
    Cookies = cookies;
    Body = body;
    CacheKey = cacheKey;
    Error = error;
  }

  public IReadOnlyDictionary<string, string> Headers { get; }

  public IReadOnlyList<ClientResponseCookie> Cookies { get; }

  public int HttpStatus { get; }

  public byte[]? Body { get; }

  public string? CacheKey { get; }

  public string? Error { get; }
}
