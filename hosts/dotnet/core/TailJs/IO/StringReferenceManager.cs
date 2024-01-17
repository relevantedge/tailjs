namespace TailJs.IO;

public class StringReferenceManager
{
  private readonly Dictionary<object, string> _values = new();

  public string GetStringId(string data)
  {
    if (!_values.TryGetValue(data, out var reference))
    {
      _values.Add(data, reference = _values.Count.ToString());
    }

    return reference;
  }

  public void Clear() => _values.Clear();
}
