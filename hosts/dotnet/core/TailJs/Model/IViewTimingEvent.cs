using System;

namespace TailJs.Model;

public interface IViewTimingEvent : ITrackedEvent
{
  ViewTimingEventTiming? Timing { get; }
}

#region Anonymous types

  public record ViewTimingEventTiming(
    TimeSpan? InteractiveTime = null,
    TimeSpan? VisibleTime = null,
    TimeSpan? TotalTime = null,
    long? Activations = null
  )
  {
    /// <summary>
    /// The time the user has been active in the view/tab. Interactive time is measured as the time where the user is actively scrolling, typing or similar. Specifically defined as [transient activation](https://developer.mozilla.org/en-US/docs/Glossary/Transient_activation) with a timeout of 10 seconds.
    /// </summary>
    public TimeSpan? InteractiveTime { get; set; } = InteractiveTime;
    
    /// <summary>
    /// The time the view/tab has been visible.
    /// </summary>
    public TimeSpan? VisibleTime { get; set; } = VisibleTime;
    
    /// <summary>
    /// The time elapsed since the view/tab was opened.
    /// </summary>
    public TimeSpan? TotalTime { get; set; } = TotalTime;
    
    /// <summary>
    /// The number of times the user toggled away from the view/tab and back.
    /// </summary>
    public long? Activations { get; set; } = Activations;
  }
  
  
#endregion

