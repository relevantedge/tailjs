using System;

namespace TailJs.Model;

/// <summary>
/// The base type for all events that are tracked.
/// 
/// The naming convention is:
/// - If the event represents something that can also be considered an entity like &quot;a page view&quot;, &quot;a user location&quot; etc. the name should be a (deverbal) noun.
/// - If the event only indicates something that happend, like &quot;session started&quot;, &quot;view ended&quot; etc. the name should be a verb in the past tense.
/// </summary>
public interface ITrackedEvent : ITagged
{
  /// <summary>
  /// The type name of the event.
  /// 
  /// This MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered.
  /// </summary>
  string Type { get; }
  
  /// <summary>
  /// The ID of the schema the event comes from. It is suggested that the schema ID ends with a hash followed by a SemVer version number. (e.g. urn:tail-f#0.9.0)
  /// </summary>
  string? Schema { get; }
  
  /// <summary>
  /// This may be assigned or transformed by backends if needed. It is client-assigned for  <see cref="ViewEvent"/> s
  /// </summary>
  string? Id { get; }
  
  /// <summary>
  /// This is set by the client and can be used to dedupplicate events sent multiple times if the endpoint timed out.
  /// </summary>
  string? ClientId { get; }
  
  /// <summary>
  /// The number of times the client tried to sent the event if the endpoint timed out
  /// 
  /// The default value is 0.
  /// </summary>
  long? Retry { get; }
  
  /// <summary>
  /// The event that caused this event to be triggered or got triggered in the same context. For example a  <see cref="NavigationEvent"/>  may trigger a  <see cref="ViewEvent"/> , or a  <see cref="CartUpdatedEvent"/>  my be triggered with a  <see cref="ComponentClickEvent"/> .
  /// </summary>
  string? Related { get; }
  
  /// <summary>
  /// The session associated with the event.
  /// </summary>
  Session? Session { get; }
  
  /// <summary>
  /// When applicable, the view where the event happened (related by  <see cref="ViewEvent"/> ).
  /// </summary>
  string? View { get; }
  
  /// <summary>
  /// This timestamp will always have a value before it reaches a backend. If specified, it must be a negative number when sent from the client (difference between when the event was generated and when is was posted in milliseconds).
  /// 
  /// This is a Unix timestamp (milliseconds).
  /// 
  /// The default value is now.
  /// </summary>
  long? Timestamp { get; }
}

