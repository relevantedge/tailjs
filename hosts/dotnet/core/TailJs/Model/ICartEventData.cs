using System;

namespace TailJs.Model;

public interface ICartEventData : IOrderQuantity
{
  /// <summary>
  /// The way the cart was modified.
  /// 
  /// The default value is add.
  /// </summary>
  string? Action { get; }
}

public record CartEventData(
  decimal? Price = null,
  string? Unit = null,
  string? Currency = null,
  ExternalReference? Variation = null,
  double? Stock = null,
  long? Units = null,
  ExternalReference? Item = null,
  string? Action = null
) : IOrderQuantity
{
  /// <summary>
  /// The unit price.
  /// </summary>
  public decimal? Price { get; set; } = Price;
  
  /// <summary>
  /// The unit the item is sold by.
  /// </summary>
  public string? Unit { get; set; } = Unit;
  
  /// <summary>
  /// The currency of the price. This field does not have a default value; if unspecified it must be assumed from context.
  /// </summary>
  public string? Currency { get; set; } = Currency;
  
  /// <summary>
  /// The specific variant of the content if the item sold comes in different variations (e.g. red/green/purple).
  /// </summary>
  public ExternalReference? Variation { get; set; } = Variation;
  
  /// <summary>
  /// The current number of units in stock.
  /// 
  /// Use fixed integer values if you do not want to reveal the actual stock, e.g. (0 = none, 10 = few, 100 = many).
  /// </summary>
  public double? Stock { get; set; } = Stock;
  
  /// <summary>
  /// The number of units.
  /// 
  /// The default value is 1.
  /// </summary>
  public long? Units { get; set; } = Units;
  
  /// <summary>
  /// The item that relates to this quantity. If not explictly set it will get its value from the closest associated content in a  <see cref="IUserInteractionEvent"/>  context.
  /// </summary>
  public ExternalReference? Item { get; set; } = Item;
  
  /// <summary>
  /// The way the cart was modified.
  /// 
  /// The default value is add.
  /// </summary>
  public string? Action { get; set; } = Action;
}


