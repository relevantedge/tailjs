﻿using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Nodes;
using Microsoft.ClearScript;

namespace TailJs.Scripting;

[SuppressMessage("ReSharper", "InconsistentNaming")]
internal class TrackerExtensionProxy
{
  private readonly ITrackerExtension _extension;
  private readonly JsonNodeConverter _json;

  public TrackerExtensionProxy(ITrackerExtension extension, JsonNodeConverter json)
  {
    _extension = extension;
    _json = json;
  }

  public object? initialize(IScriptObject environment) =>
    _extension.InitializeAsync(environment.RequireAttachment<TrackerEnvironment>()).AsPromiseLike();

  public object? apply(IScriptObject tracker, object? context = null) =>
    _extension.ApplyAsync(tracker.RequireAttachment<Tracker>()).AsPromiseLike();

  private IReadOnlyList<JsonObject> ParseEvents(object? scriptEvents) =>
    (scriptEvents as IScriptObject ?? throw new InvalidOperationException("Not a list of events."))
      .EnumerateScriptValues(ev =>
        (_json.ConvertFromScriptValue(ev) as JsonObject)
        ?? throw new InvalidOperationException("Unexpected non-object for event")
      )
      .ToList();

  public object? patch(
    IScriptObject events,
    IScriptObject next,
    IScriptObject tracker,
    object? context = null
  ) =>
    _extension
      .PatchAsync(
        ParseEvents(events),
        async (events, cancellationToken) =>
          ParseEvents(
            await next.InvokeAsFunction(_json.ConvertToScriptValue(events))
              .AwaitScript(cancellationToken: cancellationToken)
          ),
        tracker.RequireAttachment<Tracker>()
      )
      .AsPromiseLike();

  public object? post(IScriptObject events, IScriptObject tracker, object? context = null) =>
    _extension.PostAsync(ParseEvents(events), tracker.RequireAttachment<Tracker>()).AsPromiseLike();

  public object? getClientScripts(IScriptObject tracker) =>
    _extension.GetClientScriptsAsync(new ScriptTrackerHandle(tracker)).AsPromiseLike();
}
