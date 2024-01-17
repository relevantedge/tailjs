using System.Text.Json.Nodes;

using Microsoft.Extensions.Logging;

namespace TailJs;

public record LogMessage(
  JsonNode? Data,
  LogLevel Level = LogLevel.Information,
  string? Group = null,
  string? Source = null
);
