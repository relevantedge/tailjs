using JavaScriptEngineSwitcher.Extensions.MsDependencyInjection;
using JavaScriptEngineSwitcher.V8;

using Microsoft.AspNetCore.HttpOverrides;

using Polly;

using React.AspNet;

using TailJs.AspNet;
using TailJs.Model;

using Umbraco.Cms.Core.Models.Blocks;
using Umbraco.Cms.Web.Common.PublishedModels;

namespace TailJs.Umbraco.Example
{
  public class Startup
  {
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;

    /// <summary>
    /// Initializes a new instance of the <see cref="Startup" /> class.
    /// </summary>
    /// <param name="webHostEnvironment">The web hosting environment.</param>
    /// <param name="config">The configuration.</param>
    /// <remarks>
    /// Only a few services are possible to be injected here https://github.com/dotnet/aspnetcore/issues/9337.
    /// </remarks>
    public Startup(IWebHostEnvironment webHostEnvironment, IConfiguration config)
    {
      _env = webHostEnvironment ?? throw new ArgumentNullException(nameof(webHostEnvironment));
      _config = config ?? throw new ArgumentNullException(nameof(config));
    }

    /// <summary>
    /// Configures the services.
    /// </summary>
    /// <param name="services">The services.</param>
    /// <remarks>
    /// This method gets called by the runtime. Use this method to add services to the container.
    /// For more information on how to configure your application, visit https://go.microsoft.com/fwlink/?LinkID=398940.
    /// </remarks>
    public void ConfigureServices(IServiceCollection services)
    {
      services.Configure<ForwardedHeadersOptions>(options =>
      {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
      });

      services.AddUmbraco(_env, _config).AddBackOffice().AddWebsite().AddComposers().Build();

      services.AddReact();
      services
        .AddJsEngineSwitcher(options =>
        {
          options.DefaultEngineName = V8JsEngine.EngineName;
        })
        .AddV8();

      services.AddModelMapping<BlockGridItem>(
        (item, context, _) =>
          context.HasOwnModel()
            ? context.Mapper.MapComponent(item.Content, context).WithTrackerSettings(new() { Promote = true })
            : null
      );

      services.AddModelMapping<ContentBlock>(
        (item, context, next) =>
          context.IfComponent(_ =>
          {
            var inner = next();
            return inner is { Content: { } content }
              ? inner with
              {
                Content = content with
                {
                  Name = item.Headline,
                  Commerce = new CommerceData(Price: Random.Shared.Next(1, 50) / 2m)
                }
              }
              : inner;
          })
      );
    }

    /// <summary>
    /// Configures the application.
    /// </summary>
    /// <param name="app">The application builder.</param>
    /// <param name="env">The web hosting environment.</param>
    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
      app.UseForwardedHeaders();
      if (env.IsDevelopment())
      {
        app.UseDeveloperExceptionPage();
      }

      app.UseReact(config =>
      {
        config
          .SetLoadBabel(false)
          .SetLoadReact(false)
          .SetReuseJavaScriptEngines(true)
          .AddScriptWithoutTransform("~/static/ssr.js");
      });

      app.UseUmbraco()
        .WithMiddleware(u =>
        {
          u.UseBackOffice();
          u.UseWebsite();
        })
        .WithEndpoints(u =>
        {
          u.UseInstallerEndpoints();
          u.UseBackOfficeEndpoints();
          u.UseWebsiteEndpoints();
        });
    }
  }
}
