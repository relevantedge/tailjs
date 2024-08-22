namespace TailJs.Variables;

public interface IReadOnlyVariableStorage
{
  ValueTask InitializeAsync(ITrackerEnvironment environment, CancellationToken cancellationToken = default);

  ValueTask<IReadOnlyList<IVariableGetResult?>> GetAsync(
    IReadOnlyList<IVariableGetter?> getters,
    CancellationToken cancellationToken = default
  );

  ValueTask<VariableHeadResults> HeadAsync(
    IReadOnlyList<VariableFilter> filters,
    VariableQueryOptions options,
    CancellationToken cancellationToken = default
  );

  ValueTask<VariableHeadResults> QueryAsync(
    IReadOnlyList<VariableFilter> filters,
    VariableQueryOptions options,
    CancellationToken cancellationToken = default
  );
}

public interface IVariableStorage : IReadOnlyVariableStorage
{
  ValueTask<IReadOnlyList<IVariableSetResult?>> SetAsync(
    IReadOnlyList<IVariableSetter?> setters,
    CancellationToken cancellationToken = default
  );

  ValueTask RenewAsync(
    VariableScope scope,
    IReadOnlyList<string> targetIds,
    CancellationToken cancellationToken = default
  );

  ValueTask<bool> PurgeAsync(
    IReadOnlyList<VariableFilter> filters,
    CancellationToken cancellationToken = default
  );
}
