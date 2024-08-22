using System.Text.Json;
using System.Text.Json.Nodes;
using Newtonsoft.Json.Linq;

namespace TailJs;

public static class TrackerExtensions
{
  public static Task PostEventsAsync(
    this ITracker tracker,
    IEnumerable<JObject> events,
    CancellationToken cancellationToken = default
  ) => tracker.PostEventsAsync(events.Select(ev => ev.ToString()), cancellationToken);

  public static Task PostEventsAsync(
    this ITracker tracker,
    IEnumerable<JsonObject> events,
    CancellationToken cancellationToken = default
  ) => tracker.PostEventsAsync(events.Select(ev => ev.ToJsonString()), cancellationToken);

  public static Task PostEventsAsync(
    this ITracker tracker,
    IEnumerable<JsonElement> events,
    CancellationToken cancellationToken = default
  ) => tracker.PostEventsAsync(events.Select(ev => ev.ToString()), cancellationToken);

  public static Task PostEventsAsync(
    this ITracker tracker,
    IEnumerable<object?> events,
    CancellationToken cancellationToken = default
  ) =>
    tracker.PostEventsAsync(
      events.Where(ev => ev != null).Select(ev => JsonSerializer.Serialize(ev, ev!.GetType())),
      cancellationToken
    );
}
