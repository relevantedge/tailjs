namespace TailJs.Variables;

[Flags]
public enum DataPurposes
{
  Necessary = 1 << 0,
  Performance = 1 << 1,
  Functionality = 1 << 2,
  Marketing = 1 << 3,
  Personalization = 1 << 4,
  Security = 1 << 5,

  // There are some additional internal purposes that are not exposed through this API, so don't do ~0.
  Any = Necessary | Functionality | Performance | Marketing | Security | Personalization,
}

// public record DataPurposes(
//   bool Performance = false,
//   bool Functionality = false,
//   bool Marketing = false,
//   bool Personalization = false,
//   bool Security = false
// );
