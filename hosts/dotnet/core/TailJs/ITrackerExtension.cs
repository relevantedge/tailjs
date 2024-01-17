namespace TailJs;

/// <summary>
/// Stub. .NET to JS extensions not yet implemented.
/// </summary>
public interface ITrackerExtension
{
  string Name { get; }

  ValueTask InitializeAsync(ITrackerEnvironment environment);

  ValueTask ApplyAsync(ITracker tracker, ITrackerEnvironment environment);

  ValueTask<string[]?> UpdateAsync(string eventJson, ITracker tracker, ITrackerEnvironment environment);

  ValueTask PostAsync(string[] eventJson, ITracker tracker, ITrackerEnvironment environment);

  ValueTask<ClientScript[]> GetClientScriptsAsync(ITracker tracker, ITrackerEnvironment environment);
}
