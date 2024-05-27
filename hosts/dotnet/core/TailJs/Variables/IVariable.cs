using System.Text.Json.Nodes;

namespace TailJs.Variables;

public interface IVariable : IVariableHeader
{
  JsonNode? Value { get; }
}

public record Variable(
  VariableScope Scope,
  string Key,
  string? TargetId,
  DataClassification Classification,
  DataPurposes Purposes,
  DateTime Created,
  DateTime Modified,
  DateTime Accessed,
  string Version,
  JsonNode? Value,
  string[]? Tags = null,
  TimeSpan? TimeToLive = null
) : VariableKey(Scope, Key, TargetId), IVariable
{
  #region IVariable Members

  public DateTime Accessed { get; set; } = Accessed;

  public DataClassification Classification { get; set; } = Classification;

  public DateTime Created { get; set; } = Created;

  public DateTime Modified { get; set; } = Modified;

  public DataPurposes Purposes { get; set; } = Purposes;

  public string[]? Tags { get; set; } = Tags;

  public JsonNode? Value { get; set; } = Value;

  public string Version { get; set; } = Version;

  #endregion

  DataPurposes? IVariableUsageWithDefaults.Purposes => Purposes;

  DataClassification? IVariableUsageWithDefaults.Classification => Classification;
}
