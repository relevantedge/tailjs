namespace TailJs.Variables;

public interface IVariableUsageWithDefaults
{
  DataClassification? Classification { get; }
  DataPurposes? Purposes { get; }
}

public interface IVariableUsage : IVariableUsageWithDefaults
{
  new DataClassification Classification { get; }
  new DataPurposes Purposes { get; }
}
