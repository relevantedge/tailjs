using System;

namespace TailJs.Model;

/// <summary>
/// A form field value in a  <see cref="FormEvent"/> .
/// </summary>
public record FormField(
  string Name,
  string? Id = null,
  string? Label = null,
  string? Type = null,
  bool? Filled = null,
  long? Corrections = null,
  TimeSpan? ActiveTime = null,
  TimeSpan? TotalTime = null,
  string? Value = null,
  long? FillOrder = null,
  bool? LastField = null
)
{
  /// <summary>
  /// The name of the form field.
  /// </summary>
  public string Name { get; set; } = Name;
  
  public string? Id { get; set; } = Id;
  
  /// <summary>
  /// The label of the form field.
  /// </summary>
  public string? Label { get; set; } = Label;
  
  /// <summary>
  /// The type of the input field.
  /// </summary>
  public string? Type { get; set; } = Type;
  
  /// <summary>
  /// If a user provided a value for the form field.
  /// 
  /// For checkboxes and prefilled drop-downs this is only set if the user changed the value (for checkboxes that is clicked them).
  /// </summary>
  public bool? Filled { get; set; } = Filled;
  
  /// <summary>
  /// The number of times the field was changed after initially being filled.
  /// </summary>
  public long? Corrections { get; set; } = Corrections;
  
  /// <summary>
  /// How long the user was active in the field (field had focus on active tab).
  /// </summary>
  public TimeSpan? ActiveTime { get; set; } = ActiveTime;
  
  /// <summary>
  /// How long the user was in the field (including if the user left the tab and came back).
  /// </summary>
  public TimeSpan? TotalTime { get; set; } = TotalTime;
  
  /// <summary>
  /// The value of the form field. Be careful with this one, if you have connected a backend where you don&#39;t control the data. This value will not be populated unless the user has consented.
  /// </summary>
  public string? Value { get; set; } = Value;
  
  /// <summary>
  /// This field&#39;s number in the order the form was filled. A field is &quot;filled&quot; the first time the user types something in it.
  /// 
  /// If a checkbox or pre-filled drop down is left unchanged it will not get assigned a number.
  /// </summary>
  public long? FillOrder { get; set; } = FillOrder;
  
  /// <summary>
  /// The field was the last one to be filled before the form was either submitted or abandoned.
  /// </summary>
  public bool? LastField { get; set; } = LastField;
}


