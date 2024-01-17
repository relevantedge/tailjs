using System;

namespace TailJs.Model;

/// <summary>
/// Events related to order payments.
/// </summary>
public interface IPaymentEvent : ICommerceEvent
{
  /// <summary>
  /// The reference to order for which payment was made, either  <see cref="IOrder.OrderId"/>  or  <see cref="IOrder.InternalId"/> .
  /// </summary>
  string OrderReference { get; }
  
  /// <summary>
  /// The amount paid.
  /// </summary>
  decimal Amount { get; }
  
  /// <summary>
  /// A domain specific value for the payment method.
  /// </summary>
  string? PaymentMethod { get; }
  
  /// <summary>
  /// The currency of the payment.
  /// </summary>
  string? Currency { get; }
}

