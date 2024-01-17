---
title: ASP.NET
sidebar:
  order: 10
---

_More details will be added to this guide soon._

For ASP.NET you will need to install the NuGet package.

```shell
dotnet add package TailJs.AspNet
```

Then you need to bootstrap register the services.

```c#
var builder = WebApplication.CreateBuilder(args);

// Whatever you already have...
builder.Services.AddRazorPages();
builder.Services.AddControllersWithViews();

// And then
builder.Services.AddTailJs(builder.Config);
// To track Razor views as components
app.AddSingleton<IModelTypeMapper, RazorComponentMapper>()

var app = builder.Build();

app.UseTailJs();

// ...
```

This will start automatically inject the client script in your pages and start tracking Razor views as components.

If using a CMS you can implement `IContextItemResolver` and add an `IModelTypeMapper`
