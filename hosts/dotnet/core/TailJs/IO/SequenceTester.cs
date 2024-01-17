using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

namespace TailJs.IO;

[StructLayout(LayoutKind.Sequential)]
internal unsafe struct SequenceTester
{
  public static readonly SequenceTester None = new(Array.Empty<char>()) { _index = int.MaxValue };

#pragma warning disable CS0649
  // The hell it is unassigned...

  // Longest skip sequence defined in NeoWriter.Constants "</textarea>"
  private fixed char _match[11];
#pragma warning restore CS0649
  private int _index = 0;

  public SequenceTester(string match) : this(match.ToCharArray()) { }

  public SequenceTester(params char[] match)
  {
    Length = match.Length;
    for (var i = 0; i < match.Length; i++)
    {
      _match[i] = match[i];
    }
  }

  public bool Success => _index == Length;
  public int Length { get; }

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  public bool Test(char p)
  {
    if (_index < Length && _match[_index++] == p)
    {
      return true;
    }

    _index = int.MaxValue - 1;
    return false;
  }

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  public bool TestOrReset(char p)
  {
    if (Test(p))
    {
      return true;
    }
    Reset();
    return false;
  }

  [MethodImpl(MethodImplOptions.AggressiveInlining)]
  public void Reset() => _index = 0;

  public static implicit operator SequenceTester(string sequence) => new(sequence);
}
