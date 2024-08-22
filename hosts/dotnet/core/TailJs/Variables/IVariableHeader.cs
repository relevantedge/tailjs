using System.Text.Json.Nodes;

namespace TailJs.Variables;

public interface IVariableHeader : IVariableVersion, IVariableUsage, IVariableMetadata { }

public interface IPartialVariable : IVersionedVariableKey, IVariableUsageWithDefaults, IVariableMetadata
{
  JsonNode? Value { get; }
}
