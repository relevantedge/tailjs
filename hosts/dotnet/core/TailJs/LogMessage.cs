using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;

namespace TailJs;

public record LogError(string Message, string? Name, string? Stack = null);

public record LogMessage(
  string Message,
  LogLevel Level = LogLevel.Information,
  string? Group = null,
  string? Source = null,
  LogError? Error = null,
  JsonObject? Details = null,
  string? ThrottleKey = null
);
