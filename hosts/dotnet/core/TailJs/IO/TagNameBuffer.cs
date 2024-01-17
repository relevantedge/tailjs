namespace TailJs.IO;

internal unsafe struct TagNameBuffer
{
#pragma warning disable CS0649
  // The hell it is unassigned...

  // Longest tag name defined in NeoWriter.Constants
  private fixed char _chars[9];
#pragma warning restore CS0649

  public int Length { get; private set; }

  public bool IsCloseTag => Length == 0 || _chars[0] == '/';

  public void Append(char p)
  {
    if (Length >= 9)
    {
      return;
    }
    _chars[Length++] = p;
  }

  public void Reset()
  {
    Length = 0;
  }

  public override string ToString()
  {
    fixed (char* p = _chars)
    {
      return new string(p, 0, Length);
    }
  }
}
