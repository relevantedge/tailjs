using TailJs.AspNet;
using TailJs.Model;

using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.Web;
using Umbraco.Extensions;

namespace TailJs.Umbraco;

public class UmbracoItemMapper : IContextItemResolver, IModelTypeMapper
{
  private readonly IUmbracoContextAccessor _context;
  private readonly IVariationContextAccessor _variationContextAccessor;

  private Content? _currentContextItem;

  public UmbracoItemMapper(
    IUmbracoContextAccessor context,
    IVariationContextAccessor variationContextAccessor
  )
  {
    _context = context;
    _variationContextAccessor = variationContextAccessor;
  }

  private string? TryResolveCulture() =>
    _variationContextAccessor.VariationContext?.Culture is { Length: > 0 } variationContextCulture
      ? variationContextCulture
      : _context.TryGetUmbracoContext(out var umbraco)
      && umbraco.PublishedRequest?.Culture is { } requestCulture
        ? requestCulture
        : null;

  protected virtual Content? MapContent(object? model, bool forContextItem)
  {
    if (model is IPublishedContent publishedContent)
    {
      var request = _context.TryGetUmbracoContext(out var umbraco) ? umbraco.PublishedRequest : null;
      if (!forContextItem && publishedContent.Id == request?.PublishedContent?.Id)
      {
        // Don't repeat the main content endlessly
        return null;
      }
      return new Content(
        Id: publishedContent.Key.ToString(),
        Name: publishedContent.Name,
        ItemType: $"umbraco/{publishedContent.GetTemplateAlias()}",
        Language: TryResolveCulture(),
        Version: publishedContent.UpdateDate.ToUniversalTime().ToString("s")
      );
    }

    if (model is IPublishedElement publishedElement)
    {
      return new Content(
        Id: publishedElement.Key.ToString(),
        ItemType: $"umbraco/{publishedElement.ContentType.Alias}",
        Language: TryResolveCulture()
      );
    }

    return null;
  }

  public ConfiguredComponent? MapComponent(object? component)
  {
    if (component is IPublishedContent publishedContent)
    {
      return new ConfiguredComponent(
        Id: publishedContent.Key.ToString(),
        Name: publishedContent.Name,
        TypeName: publishedContent.GetTemplateAlias(),
        Language: TryResolveCulture()
      );
    }

    if (component is IPublishedElement element)
    {
      return new ConfiguredComponent(
        Id: element.ContentType.Key.ToString(),
        InstanceId: element.Key.ToString(),
        Name: element
          .Value<string>("componentName")!
          .OrIfNullOrWhiteSpace(element.Value<string>("formName")!)
          .OrIfNullOrWhiteSpace(element.ContentType.Alias),
        TypeName: element.ContentType.Alias,
        Language: TryResolveCulture()
      );
    }

    return null;
  }

  #region IContextItemResolver Members

  public Content? CurrentContextItem
  {
    get
    {
      if (
        _context.TryGetUmbracoContext(out var umbraco)
        && umbraco.PublishedRequest?.PublishedContent is { } content
      )
      {
        if (_currentContextItem?.Id != content.Key.ToString())
        {
          _currentContextItem = MapContent(content, true);
        }
      }
      else
      {
        _currentContextItem = null;
      }

      return _currentContextItem;
    }
  }

  public EnvironmentType? EnvironmentType
  {
    get
    {
      if (_context.TryGetUmbracoContext(out var umbraco))
        return umbraco.IsFrontEndUmbracoRequest()
          ? AspNet.EnvironmentType.Public
          : AspNet.EnvironmentType.None;
      return AspNet.EnvironmentType.None;
    }
  }

  public int Priority => 10;

  #endregion


  #region IModelTypeMapper Members

  public ElementBoundaryMapping? MapModel(
    object? model,
    MappingContext context,
    Func<ElementBoundaryMapping> next
  ) =>
    !context.HasOwnModel()
      ? null
      : context is ComponentMappingContext
        ? new(Component: MapComponent(model))
        : new(Content: MapContent(model, false));

  public bool Match(Type modelType) => typeof(IPublishedElement).IsAssignableFrom(modelType);

  #endregion
}
