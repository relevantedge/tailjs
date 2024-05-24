using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ViewEngines;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using TailJs.AspNet.Helpers;
using TailJs.IO;
using TailJs.Scripting;

namespace TailJs.AspNet;

public static class ConfigurationExtensions
{
  public static T AddTailJs<T>(
    this T services,
    IConfiguration? configuration = null,
    IReadOnlyCollection<ITrackerExtension>? extensions = null,
    TrackerConfiguration? configurationOverride = null
  )
    where T : IServiceCollection
  {
    var tailFConfiguration = configuration?.GetSection("TailJs");
    if (!tailFConfiguration.Exists())
    {
      tailFConfiguration = configuration?.GetSection("TailJs");
    }
    var disabled = tailFConfiguration?.GetValue<bool?>("Disable") == true;

    if (!services.Any(service => service.ServiceType == typeof(IHttpContextAccessor)))
    {
      services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
    }

    if (tailFConfiguration == null)
    {
      configurationOverride ??= new();
      services.AddSingleton(Options.Create(configurationOverride));
      disabled = configurationOverride.Disable;
    }
    else
    {
      services.Configure<TrackerConfiguration>(tailFConfiguration);
    }

    if (disabled)
    {
      services.AddSingleton<IRequestHandler, NullRequestHandler>();
      services.AddSingleton<ITrackerRenderingContext, NullTrackerRenderingContext>();
    }
    else
    {
      services.AddSingleton<DataMarkupWriterFactory>();
      services.AddSingleton<IModelContext, ModelContext>();
      services.AddSingleton<IScriptLoggerFactory, ScriptLoggerFactory>();
      services.AddSingleton<IRequestHandlerPool, RequestHandlerPool>();
      services.AddSingleton<RequestHandlerPool.Services>(provider =>
        new(provider.GetRequiredService<IWebHostEnvironment>().ContentRootFileProvider, extensions)
      );
      services.AddScoped<ObjectLease<DataMarkupWriter>>(services =>
        services.GetRequiredService<DataMarkupWriterFactory>().Rent()
      );
      services.AddScoped<ITrackerRenderingContext, TrackerRenderingContext>();
      services.AddScoped<IViewWriterAccessor, ViewWriterAccessor>();
      services.AddScoped<RazorPageObserver>();

      services.Decorate<ICompositeViewEngine, ViewEngineDecorator>();
      services.AddScoped<IRequestHandler>(provider =>
        provider.GetRequiredService<IRequestHandlerPool>().GetRequestHandler()
      );
      services.AddScoped<ITrackerEnvironment>(provider =>
        provider.GetRequiredService<IRequestHandler>().Environment!
      );
    }

    services.AddScoped<TrackerHelper>();
    services.AddScoped<ITrackerAccessor, TrackerAccessor>();
    services.AddTransient(services => services.GetRequiredService<ObjectLease<DataMarkupWriter>>().Item);
    services.AddTransient<ITrackerHandle>(services =>
      services.GetRequiredService<ITrackerAccessor>().TrackerHandle
      ?? throw new InvalidOperationException("There is no tracker in the current context.")
    );

    return services;
  }

  public static T UseTailJs<T>(this T builder)
    where T : IApplicationBuilder
  {
    builder.UseMiddleware<TrackerMiddleware>();

    return builder;
  }

  public static IServiceCollection AddModelMapping<T>(
    this IServiceCollection services,
    Func<T, MappingContext, Func<ElementBoundaryMapping?>, ElementBoundaryMapping?> mapper,
    int priority = 0
  )
  {
    services.AddSingleton<IModelTypeMapper>(new ModelTypeMapper<T>(mapper, priority));
    return services;
  }

  private static void Decorate<TInterface, TDecorator>(this IServiceCollection services)
    where TInterface : class
    where TDecorator : class, TInterface
  {
    if (services.FirstOrDefault(s => s.ServiceType == typeof(TInterface)) is not { } wrappedDescriptor)
      throw new InvalidOperationException($"{typeof(TInterface).Name} is not registered");

    var objectFactory = ActivatorUtilities.CreateFactory(typeof(TDecorator), new[] { typeof(TInterface) });

    services.Replace(
      ServiceDescriptor.Describe(
        typeof(TInterface),
        s => (TInterface)objectFactory(s, new[] { s.CreateInstance(wrappedDescriptor) }),
        wrappedDescriptor.Lifetime
      )
    );
  }

  private static object CreateInstance(this IServiceProvider services, ServiceDescriptor descriptor) =>
    descriptor.ImplementationInstance
    ?? (
      descriptor.ImplementationFactory != null
        ? descriptor.ImplementationFactory(services)
        : ActivatorUtilities.GetServiceOrCreateInstance(services, descriptor.ImplementationType!)
    );
}
