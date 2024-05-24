namespace TailJs;

public record TrackerContext(
  ITrackerHandle TrackerHandle,
  ClientResponse? Response,
  bool InitializedEnvironment
);
