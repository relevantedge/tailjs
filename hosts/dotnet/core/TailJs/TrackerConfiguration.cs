using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using TailJs.Variables;

namespace TailJs;

public class TrackerConfiguration : IOptionsMonitor<TrackerConfiguration>
{
  public bool Disable { get; set; }

  public string TrackerName { get; set; } = "tail";

  public string? ResourcePath { get; set; } = "res";

  public string Endpoint { get; set; } = "/_t.js";

  public string? ScriptDirectory { get; set; }

  public string? ClientScript { get; set; }

  public List<string> CookieKeys { get; set; } = new() { "3EB4E78E-992D-4006-85E0-1D42DC0E08B9" };

  public string? ClientKeySeed { get; set; } = "3635EB29-71B9-4E7B-A208-1FC977F3AF02";

  public bool UseSession { get; set; } = true;

  public int InstanceCount { get; set; } = 1;

  public bool Debug { get; set; } = false;

  public bool PostEvents { get; set; } = true;

  public string AttributeName { get; set; } = "_t";

  public bool WriteTextMarkers { get; set; } = true;

  public bool UseReferences { get; set; } = true;

  public int WriterPoolSize { get; set; } = 10;

  public bool IgnoreScopeData { get; set; } = false;

  public bool Secure { get; set; } = true;

  public UserConsent? DefaultConsent { get; set; }

  /// <summary>
  /// Whether configuration and component data should be passed to the client as JSON instead of using MessagePack.
  /// Good for testing and debugging.
  /// </summary>
  public bool UseJson { get; set; } = true;

  public List<ScriptExtensionConfiguration> ScriptExtensions { get; set; } = new();

  public TrackerConfiguration Get(string? name) => this;

  public IDisposable? OnChange(Action<TrackerConfiguration, string?> listener) => null;

  public TrackerConfiguration CurrentValue => this;

  /// <summary>
  /// Rules to decide whether to include or exclude data-* attributes as tags.
  /// ECMAScript syntax for regular expressions is supported. Otherwise, explicit attribute names separated by comma are assumed.
  /// The first rule that explicitly includes are excludes is used.
  ///
  /// The default is to include attribute where the name ends with "id".
  /// Add `{"exclude":"/id$/"}` to suppress this behavior.
  /// </summary>
  public List<DataTagRule?>? DataTags { get; set; } = null;
}

public record DataTagRule(string? Include = null, string? Exclude = null);

public record ScriptExtensionConfiguration(
  string Import,
  IConfigurationSection? Settings = null,
  string? Module = null
);

public record UserConsent(DataClassification Level, DataPurposes Purposes);
