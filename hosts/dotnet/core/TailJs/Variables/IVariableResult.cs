using System.Text.Json.Nodes;

namespace TailJs.Variables;

public enum VariableResultStatus
{
  Success = 200,
  Created = 201,
  Unchanged = 304,
  Denied = 403,
  NotFound = 404,
  ReadOnly = 405,
  Conflict = 409,
  Unsupported = 501,
  Invalid = 400,
  Error = 500,
}

public interface IVariableResult : IVariableKey
{
  VariableResultStatus Status { get; }
}

public interface IVariableSuccessResult : IVariableResult { }

public interface IVariableErrorResult : IVariableResult
{
  Exception? Error { get; }
}

public record VariablePatchResult(
  JsonNode? Value,
  DataClassification? Classification = null,
  DataPurposes? Purposes = null,
  string[]? Tags = null
) : IVariableUsageWithDefaults, IVariableMetadata;
