using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

using TailJs.AspNet;

using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace TailJs.Umbraco;

public class Bootstrap : IComposer, IStartupFilter
{
  public void Compose(IUmbracoBuilder builder)
  {
    builder.Services
      .AddSingleton<UmbracoItemMapper>()
      .AddSingleton<IContextItemResolver>(services => services.GetRequiredService<UmbracoItemMapper>())
      .AddSingleton<IModelTypeMapper>(services => services.GetRequiredService<UmbracoItemMapper>())
      .AddSingleton<IModelTypeMapper, RazorComponentMapper>()
      .AddTailJs(builder.Config)
      .AddTransient<IStartupFilter, Bootstrap>();
  }

  public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) =>
    app =>
    {
      app.UseTailJs();
      next(app);
    };
}
