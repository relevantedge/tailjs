export const enum DataPurposes {
  Necessary = 1 << 0,
  Functionality = 1 << 1,
  Performance = 1 << 2,
  Targeting = 1 << 3,
  Security = 1 << 4,
  All = ~(~0 << 5),
}
