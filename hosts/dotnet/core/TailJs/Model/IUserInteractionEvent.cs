using System;

namespace TailJs.Model;

public interface IUserInteractionEvent : ITrackedEvent, IViewTimingEvent
{
  /// <summary>
  /// Relevant components and content in the scope of the activated element.
  /// </summary>
  List<ActivatedComponent?>? Components { get; }
  
  /// <summary>
  /// The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).
  /// </summary>
  ScreenPosition? Pos { get; }
  
  /// <summary>
  /// The viewport of the user&#39;s browser when the event happened.
  /// </summary>
  Viewport? Viewport { get; }
  
  /// <summary>
  /// An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.
  /// </summary>
  string? Area { get; }
  
  /// <summary>
  /// Information about the activated element, if any.
  /// </summary>
  UserInteractionEventElement? Element { get; }
}

#region Anonymous types

  /// <summary>
  /// Information about the activated element, if any.
  /// </summary>
  public record UserInteractionEventElement(
    string? TagName = null,
    string? Text = null
  )
  {
    /// <summary>
    /// The tag name of the activated element.
    /// </summary>
    public string? TagName { get; set; } = TagName;
    
    /// <summary>
    /// The textual content of the element that was clicked (e.g. the label on a button, or the alt text of an image)
    /// </summary>
    public string? Text { get; set; } = Text;
  }
  
  
#endregion

