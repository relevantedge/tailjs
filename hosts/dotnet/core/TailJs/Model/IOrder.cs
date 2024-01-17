using System;

namespace TailJs.Model;

/// <summary>
/// Represents an order for tracking purposes.
/// </summary>
public interface IOrder : ITagged
{
  /// <summary>
  /// A reference that can be used both before the order is completed, and if the order ID shown to the user is different from how the order is stored in underlying systems.
  /// </summary>
  string? InternalId { get; }
  
  /// <summary>
  /// The order ID as shown to the user.
  /// </summary>
  string OrderId { get; }
  
  /// <summary>
  /// Optionally, all the items in the order at the time the order was made.
  /// </summary>
  List<OrderLine?>? Items { get; }
  
  /// <summary>
  /// The total discount given for this order including the sum of individual order line discounts
  /// </summary>
  decimal? Discount { get; }
  
  /// <summary>
  /// The delivery cost, if any, and it is not included as an order line.
  /// </summary>
  decimal? Delivery { get; }
  
  /// <summary>
  /// The VAT included in the total.
  /// </summary>
  decimal? Vat { get; }
  
  /// <summary>
  /// The total of the order including VAT, delivery, discounts and any other costs added.
  /// </summary>
  decimal? Total { get; }
  
  /// <summary>
  /// The payment method selected for the order.
  /// </summary>
  string? PaymentMethod { get; }
  
  /// <summary>
  /// The currency used for the order.
  /// 
  /// The order lines are assumed to be in this currency if not explicitly specified for each. (It is not an error to have order lines with different currencies it is just a bit... unusual).
  /// </summary>
  string? Currency { get; }
}

