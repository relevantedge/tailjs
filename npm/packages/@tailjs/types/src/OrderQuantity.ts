import type {
  CartUpdatedEvent,
  CommerceData,
  ExternalReference,
  Integer,
  Order,
  OrderLine,
  UserInteractionEvent,
} from ".";

/**
 * Base information for the amount of an item added to an {@link Order} or cart that is shared between {@link CartUpdatedEvent} and {@link OrderLine}.
 */
export interface OrderQuantity extends CommerceData {
  /**
   * The number of units.
   * @default 1
   */
  units?: Integer;

  /**
   * The item that relates to this quantity.
   * If not explictly set it will get its value from the closest associated content in a {@link UserInteractionEvent} context.
   */
  item?: ExternalReference;
}
