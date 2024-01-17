using System.Text.Json.Nodes;

namespace TailJs.CodeGen;

public static class JsonNodeExtensions
{
  public static IEnumerable<KeyValuePair<string, JsonNode?>> Properties(
    this JsonNode? node,
    params string[] propertyPath
  ) => node.Navigate(propertyPath) as JsonObject ?? Enumerable.Empty<KeyValuePair<string, JsonNode?>>();

  public static JsonNode? Navigate(
    this KeyValuePair<string, JsonNode?> property,
    params string[] propertyPath
  ) => property.Value.Navigate(propertyPath);

  public static JsonNode? Navigate(this JsonNode? node, params string[] propertyPath)
  {
    foreach (var property in propertyPath)
    {
      if (node is not JsonObject jsonObject)
      {
        return default;
      }

      node = property == ".." ? jsonObject.Parent : jsonObject[property];
      if (node == null)
      {
        return default;
      }
    }

    return node;
  }

  public static IEnumerable<JsonNode?> Items(this JsonNode? node, params string[] propertyPath) =>
    node.Navigate(propertyPath) as JsonArray ?? Enumerable.Empty<JsonNode?>();

  public static IEnumerable<T?> Items<T>(this JsonNode? node, params string[] propertyPath) =>
    node.Items(propertyPath).Select(item => item.Get<T>());

  public static T? Get<T>(this KeyValuePair<string, JsonNode?> jsonProperty, params string[] propertyPath) =>
    jsonProperty.Value.Get<T>(propertyPath);

  public static T? Get<T>(this JsonNode? node, params string[] propertyPath) =>
    node.Navigate(propertyPath) is not JsonValue jsonValue
      ? default
      : jsonValue.TryGetValue(out T? value)
        ? value
        : typeof(T) == typeof(string)
          ? (T)(object)jsonValue.ToJsonString()
          : default;
}
