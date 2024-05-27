using System.Text.Json.Nodes;
using Newtonsoft.Json;
using TailJs.Model;
using TailJs.Scripting;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace TailJs;

public delegate ValueTask<IReadOnlyList<JsonObject>> NextExtension(
  IReadOnlyList<JsonObject> events,
  CancellationToken cancellationToken = default
);

/// <summary>
/// Stub. .NET to JS extensions not yet implemented.
/// </summary>
public interface ITrackerExtension
{
  string Id { get; }

  ValueTask InitializeAsync(ITrackerEnvironment environment, CancellationToken cancellationToken = default);

  ValueTask ApplyAsync(ITracker tracker, CancellationToken cancellationToken = default);

  ValueTask<IReadOnlyList<JsonObject>> PatchAsync(
    IReadOnlyList<JsonObject> events,
    NextExtension next,
    ITracker tracker,
    CancellationToken cancellationToken = default
  );

  ValueTask PostAsync(
    IReadOnlyList<JsonObject> events,
    ITracker tracker,
    CancellationToken cancellationToken = default
  );

  ValueTask<ClientScript[]> GetClientScriptsAsync(ITrackerHandle tracker);
}

public static class TrackerExtension
{
  public static JsonObject ToJson(this ITrackedEvent trackedEvent) =>
    (JsonObject)JsonNode.Parse(JsonSerializer.Serialize(trackedEvent, JsonNodeConverter.SerializerOptions))!;

  public static JsonObject ValidationError(string message) =>
    (JsonObject)
      JsonNode.Parse(JsonSerializer.Serialize(new { error = message }, JsonNodeConverter.SerializerOptions))!;
}
