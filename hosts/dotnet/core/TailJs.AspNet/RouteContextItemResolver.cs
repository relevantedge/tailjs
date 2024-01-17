using Microsoft.AspNetCore.Http;

using TailJs.Model;

namespace TailJs.AspNet;

public class RouteContextItemResolver : IContextItemResolver
{
  private readonly IHttpContextAccessor _httpContextAccessor;

  public RouteContextItemResolver(IHttpContextAccessor httpContextAccessor)
  {
    _httpContextAccessor = httpContextAccessor;
  }

  public Content? CurrentContextItem
  {
    get
    {
      if (_httpContextAccessor.HttpContext?.Request is { } request)
      {
        return new Content(request.Path);
      }

      return null;
    }
  }

  public EnvironmentType? EnvironmentType =>
    CurrentContextItem != null ? AspNet.EnvironmentType.Public : AspNet.EnvironmentType.None;
}
