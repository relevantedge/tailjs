using System;

namespace TailJs.Model;

public record Session(
  Guid SessionId,
  long Timestamp,
  Guid? DeviceId = null,
  Guid? DeviceSessionId = null,
  string? Username = null,
  string? Ip = null,
  bool? NonEssentialTrackingConsent = null
)
{
  /// <summary>
  /// The unique ID of the user&#39;s session. A new sessions starts after 30 minutes of inactivity (this is configurable, but 30 minutes is the default following GA standards). Sessions are reset when an authenticated user logs out (triggered by the  <see cref="SignOutEvent"/> ).
  /// 
  /// Aggressive measures are taken to make it literally impossible for third-party scripts to use it for fingerprinting, and virtually impossible for rogue browser extensions. It is persisted in a way that follows best practices for this kind information (secure HTTP-only cookies), hence it can be expected to be as durable as possible for the user&#39;s browser and device.
  /// 
  /// It is recommended to configure rolling encryption keys to make it cryptographically impossible to use this for fingerprinting.
  /// </summary>
  public Guid SessionId { get; set; } = SessionId;
  
  /// <summary>
  /// When the session started.
  /// 
  /// This is a Unix timestamp (milliseconds).
  /// </summary>
  public long Timestamp { get; set; } = Timestamp;
  
  /// <summary>
  /// The unique ID of the user&#39;s device. This ID does most likely not identify the device reliably over time, since it may be reset if the user purges tracking data, e.g. clears cookies or changes browser.
  /// 
  /// Aggressive measures are taken to make it literally impossible for third-party scripts to use it for fingerprinting, and virtually impossible for rogue browser extensions. It is persisted in a way that follows best practices for this kind information (secure HTTP-only cookies), hence it can be expected to be as durable as possible for the user&#39;s browser and device.
  /// 
  /// It is recommended to configure rolling encryption keys to make it cryptographically impossible to use this for fingerprinting.
  /// </summary>
  public Guid? DeviceId { get; set; } = DeviceId;
  
  /// <summary>
  /// The unique ID of the user&#39;s device session ID. A device session ends when the user has closed all tabs and windows, and starts whenever the user visits the site again. This means that device sessions can both be significantly shorter and longer that &quot;normal&quot; sessions in that it restarts whenever the user navigates completely away from the site and comes back (e.g. while evaluating search results), but it will also survive the user putting their computer to sleep or leaving their browser app in the background for a long time on their phone.
  /// 
  /// Aggressive measures are taken to make it literally impossible for third-party scripts to use it for fingerprinting, and virtually impossible for rogue browser extensions. It is persisted in a way that follows best practices for this kind information (secure HTTP-only cookies), hence it can be expected to be as durable as possible for the user&#39;s browser and device.
  /// 
  /// It is recommended to configure rolling encryption keys to make it cryptographically impossible to use this for fingerprinting.
  /// </summary>
  public Guid? DeviceSessionId { get; set; } = DeviceSessionId;
  
  /// <summary>
  /// The current user.
  /// </summary>
  public string? Username { get; set; } = Username;
  
  /// <summary>
  /// The client&#39;s IP if enabled in configuration.
  /// </summary>
  public string? Ip { get; set; } = Ip;
  
  /// <summary>
  /// If the user had consented to non-essential tracking during this session.
  /// 
  /// The default value is false.
  /// </summary>
  public bool? NonEssentialTrackingConsent { get; set; } = NonEssentialTrackingConsent;
}


