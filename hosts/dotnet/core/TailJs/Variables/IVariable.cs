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
  JsonNode? Value,
  string? Version = null,
  DateTime? Created = null,
  DateTime? Modified = null,
  string[]? Tags = null
) : VersionedVariableKey(Scope, Key, TargetId, Version), IVariable
{
  #region IVariable Members

  DataClassification? IVariableUsageWithDefaults.Classification => Classification;

  public DataClassification Classification { get; set; } = Classification;

  public DateTime? Created { get; set; } = Created;

  public string Key { get; set; } = Key;

  public DateTime? Modified { get; set; } = Modified;

  DataPurposes? IVariableUsageWithDefaults.Purposes => Purposes;

  public DataPurposes Purposes { get; set; } = Purposes;

  public VariableScope Scope { get; set; } = Scope;

  public string[]? Tags { get; set; } = Tags;

  public string? TargetId { get; set; } = TargetId;

  public JsonNode? Value { get; set; } = Value;

  public string? Version { get; set; } = Version;

  #endregion
}
