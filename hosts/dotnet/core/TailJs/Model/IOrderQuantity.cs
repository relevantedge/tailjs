using System;

namespace TailJs.Model;

/// <summary>
/// Base information for the amount of an item added to an  <see cref="IOrder"/>  or cart that is shared between  <see cref="CartUpdatedEvent"/>  and  <see cref="OrderLine"/> .
/// </summary>
public interface IOrderQuantity : ICommerceData
{
  /// <summary>
  /// The number of units.
  /// 
  /// The default value is 1.
  /// </summary>
  long? Units { get; }
  
  /// <summary>
  /// The item that relates to this quantity. If not explictly set it will get its value from the closest associated content in a  <see cref="IUserInteractionEvent"/>  context.
  /// </summary>
  ExternalReference? Item { get; }
}

/// <summary>
/// Base information for the amount of an item added to an  <see cref="IOrder"/>  or cart that is shared between  <see cref="CartUpdatedEvent"/>  and  <see cref="OrderLine"/> .
/// </summary>
public record OrderQuantity(
  decimal? Price = null,
  string? Unit = null,
  string? Currency = null,
  ExternalReference? Variation = null,
  double? Stock = null,
  long? Units = null,
  ExternalReference? Item = null
) : ICommerceData
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
}


