namespace TailJs.Variables;

[Flags]
public enum DataPurposes
{
  Necessary = 1 << 0,
  Functionality = 1 << 1,
  Performance = 1 << 2,
  Targeting = 1 << 3,
  Security = 1 << 4,
  Infrastructure = 1 << 5,
  Anonymous = Necessary | Infrastructure | Security,

  // There are some additional internal purposes that are not exposed through this API, so don't do ~0.
  Any = Necessary | Functionality | Performance | Targeting | Security | Infrastructure | Anonymous
}
