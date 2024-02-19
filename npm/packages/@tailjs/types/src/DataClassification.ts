/**
 * Defines to which degree a user has consented to personal data being collected.
 *
 * YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with default settings.
 */
export const enum DataClassification {
  /**
   * The user has not consented to the collection of any personal data.
   *
   * At this level cookie-less tracking will be used to collect anonymous data.
   *
   * During tracking, tail.js will ephemerally use traits from the user that classify as pseudonymized personal data to link session data to a truly anonymous identifier.
   * Once the session ends only the anonymous identifier will remain, and any other data used for the link has been purged.
   *
   * Identifying returning visitors will not be possible at this consent level.
   * In-session personalization will be possible based on the actions a user has taken such as adding or removing things to a shopping basket, or reading an article.
   *
   * As always, YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with default settings.
   */
  None = 0,

  /**
   * The user has consented to the collection of data that may possibly identify the user if put into context with other data, yet not specifically on its own.
   *
   * Examples of data you should classify as at least indirect personal data are IP addresses, detailed location data, and randomly generated device IDs persisted over time to track returning visitors.
   *
   * Identifying returning visitors will be possible at this level of consent, but not across devices.
   * Some level of personalization to returning visitors will be possible without knowing their specific preferences with certainty.
   *
   * This level should be confidered the default if the user is given to consent to performance data being collected via a cookie discalimer or similar.
   *
   * As always, YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with default settings.
   */
  Indirect = 1,

  /**
   * The user has consented to the collection of data that directly identifies the user on its own.
   *
   * Examples are name, username, street address and email address.
   *
   * Identifying returning visitors across devices will be possible at this level of consent.
   * Personalization based on past actions such as purchases will also be possible.
   *
   * This level should be considered the default level if users are offered an option to create a user profile or link an existing user profile from an external identity provider (Google, GitHub, Microsoft etc.).
   *
   * As always, YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with default settings.
   */
  Direct = 2,

  /**
   * The user has consented to the collection of sensitive personal data.
   * If the user is given the option to consent at this level, it should be very clear, and you must make sure that all levels of your tail.js implementation and connected services meets the necessary levels of compliance for this in your infrastructure.
   *
   * Examples are data related to health, financial matters, race, political and religious views, and union membership.
   *
   * Identifying returning visitors across devices will be possible at this level of consent.
   * and so will advanced personalization.
   *
   * As always, YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with default settings.
   */
  Sensitive = 3,
}
