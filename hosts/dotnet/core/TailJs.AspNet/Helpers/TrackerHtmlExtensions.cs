using System.Diagnostics.CodeAnalysis;
using System.Text.Encodings.Web;

using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.Extensions.DependencyInjection;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Serialization;

namespace TailJs.AspNet.Helpers;

public static class TrackerHtmlExtensions
{
  private static IHttpContextAccessor? _httpContextAccessor;

  private static readonly JsonSerializerSettings ReactJsonSerializerSettings = new JsonSerializerSettings()
  {
    NullValueHandling = NullValueHandling.Ignore,
    ContractResolver = new DefaultContractResolver() { NamingStrategy = new CamelCaseNamingStrategy() }
  };

  private static TextWriter? GetCurrentViewWriter() =>
    _httpContextAccessor?.HttpContext?.RequestServices.GetService<IViewWriterAccessor>()?.CurrentWriter;

  private static ITrackerRenderingContext? GetTrackerRenderingContext() =>
    _httpContextAccessor?.HttpContext?.RequestServices.GetService<ITrackerRenderingContext>();

  internal static void Initialize(IHttpContextAccessor httpContextAccessor)
  {
    _httpContextAccessor = httpContextAccessor;
  }

  internal static async ValueTask Render(this IHtmlContent content, TextWriter target)
  {
    if (content is HelperResult helperResult)
    {
      await helperResult.WriteAction(target);
      return;
    }
    content.WriteTo(target, HtmlEncoder.Default);
  }

  private static TrackerHelper? TrackerHelper() =>
    _httpContextAccessor?.HttpContext?.RequestServices.GetService<TrackerHelper>();

  public static IEnumerable<T> TrackContent<T>(this IEnumerable<T> contentItems)
  {
    var renderingContext = GetTrackerRenderingContext();

    foreach (var item in contentItems)
    {
      var header = renderingContext?.GetDataScopeHeader(
        renderingContext.ItemData.MapModels(item, null, null)
      );
      if (header != null)
      {
        renderingContext?.CurrentViewWriter?.Write(header.HeaderHtml);
      }

      yield return item;

      if (header != null)
      {
        renderingContext?.CurrentViewWriter?.Write(header.FooterHtml);
      }
    }
  }

  [return: NotNullIfNotNull("item")]
  public static JToken? ToComponentProperties<TContent>(
    this TContent? item,
    string propertyName = "track-content"
  ) => item.ToComponentProperties(_ => new JObject(), propertyName);

  [return: NotNullIfNotNull("item")]
  public static JToken? ToComponentProperties<TContent, TProjection>(
    this TContent? item,
    Func<TContent, TProjection> projection,
    string propertyName = "track-content"
  ) where TProjection : class
  {
    if (item == null)
    {
      return null;
    }

    if (
      projection(item) is not { } projected
      || (projected as JObject ?? JToken.FromObject(projected)) is not { } json
    )
    {
      throw new NullReferenceException();
    }

    if (
      json is JObject
      && GetTrackerRenderingContext()?.ItemData.MapModels(item, null, null) is { Content: { } content }
    )
    {
      json[propertyName] = JObject.FromObject(content, JsonSerializer.Create(ReactJsonSerializerSettings));
      if (propertyName != "track-content")
      {
        json["track-content"] = json[propertyName];
      }
    }

    return json;
  }

  public static IEnumerable<JToken> ToComponentProperties<TContent, TProjection>(
    this IEnumerable<TContent> content,
    Func<TContent, TProjection> projection,
    string propertyName = "track-content"
  ) where TProjection : class
  {
    foreach (var item in content)
    {
      if (item.ToComponentProperties(projection, propertyName) is { } json)
      {
        yield return json;
      }
    }
  }
}
