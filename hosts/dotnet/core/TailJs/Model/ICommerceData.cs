using System;

namespace TailJs.Model;

public interface ICommerceData
{
  /// <summary>
  /// The unit price.
  /// </summary>
  decimal? Price { get; }
  
  /// <summary>
  /// The unit the item is sold by.
  /// </summary>
  string? Unit { get; }
  
  /// <summary>
  /// The currency of the price. This field does not have a default value; if unspecified it must be assumed from context.
  /// </summary>
  string? Currency { get; }
  
  /// <summary>
  /// The specific variant of the content if the item sold comes in different variations (e.g. red/green/purple).
  /// </summary>
  ExternalReference? Variation { get; }
  
  /// <summary>
  /// The current number of units in stock.
  /// 
  /// Use fixed integer values if you do not want to reveal the actual stock, e.g. (0 = none, 10 = few, 100 = many).
  /// </summary>
  double? Stock { get; }
}

public record CommerceData(
  decimal? Price = null,
  string? Unit = null,
  string? Currency = null,
  ExternalReference? Variation = null,
  double? Stock = null
)
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
}


