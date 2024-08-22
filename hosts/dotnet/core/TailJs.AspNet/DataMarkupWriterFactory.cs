using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using TailJs.IO;

namespace TailJs.AspNet;

public class DataMarkupWriterFactory
{
  private readonly IHttpContextAccessor _httpContextAccessor;
  private readonly ObjectPool<DataMarkupWriter> _pool;

  public DataMarkupWriterFactory(
    IOptions<TrackerConfiguration> options,
    IHttpContextAccessor httpContextAccessor
  )
  {
    _httpContextAccessor = httpContextAccessor;
    var configuration = options.Value;
    var serializerOptions = new JsonSerializerOptions
    {
      PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
      DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
      WriteIndented = configuration.Debug
    };
    _pool = new ObjectPool<DataMarkupWriter>(
      _ => new DataMarkupWriter(
        new()
        {
          AttributeName = configuration.AttributeName,
          WriteTextMarkers = configuration.WriteTextMarkers,
          UseReferences = configuration.UseReferences,
          IgnoreScopeData = configuration.IgnoreScopeData,
          IgnoreHtmlScope = true,
          EndOfBodyContent = EndOfBodyContent,
          JsonSerializerOptions = serializerOptions
        }
      )
      {
        KeepAlive = true
      },
      writer => writer.Reset(),
      writer =>
      {
        writer.KeepAlive = false;
        writer.Dispose();
      },
      configuration.WriterPoolSize
    );
  }

  private string EndOfBodyContent(IEnumerable<string>? references) =>
    _httpContextAccessor
      .HttpContext?.RequestServices.GetService<ITrackerRenderingContext>()
      ?.GetClientScriptAsync(references)
      .Result ?? "";

  public ObjectLease<DataMarkupWriter> Rent() => _pool.Rent();
}
