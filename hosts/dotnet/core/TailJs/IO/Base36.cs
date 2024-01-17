namespace TailJs.IO;

internal static class Base36
{
  private static readonly char[] Digits = "0123456789abcdefghijklmnopqrstuvwxyz".ToCharArray();

  public static string Encode(long input)
  {
    var result = new CharBuffer();
    try
    {
      var negative = input < 0;
      if (negative)
      {
        input *= -1;
      }
      else if (input == 0)
      {
        return "0";
      }
      while (input != 0)
      {
        result.Append(Digits[input % 36]);
        input /= 36;
      }

      if (negative)
      {
        result.Append('-');
      }

      var chars = result.GetSpan().ToArray();
      Array.Reverse(chars);
      return new(chars);
    }
    finally
    {
      result.Dispose();
    }
  }
}
