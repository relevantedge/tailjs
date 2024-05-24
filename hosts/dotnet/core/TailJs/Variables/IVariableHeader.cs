namespace TailJs.Variables;

public interface IVariableHeader : IVariableKey, IVariableUsage, IVariableVersion, IVariableMetadata { }

public record VariableHeader(
  VariableScope Scope,
  string Key,
  string? TargetId,
  DataClassification Classification,
  DataPurposes Purposes,
  string? Version = null,
  DateTime? Created = null,
  DateTime? Modified = null,
  string[]? Tags = null
) : IVariableHeader
{
  DataClassification? IVariableUsageWithDefaults.Classification { get; } = Classification;

  DataPurposes? IVariableUsageWithDefaults.Purposes { get; } = Purposes;
}
