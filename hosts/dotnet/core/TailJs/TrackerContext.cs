namespace TailJs;

public record TrackerContext(ITracker Tracker, ClientResponse? Response, bool InitializedEnvironment);
