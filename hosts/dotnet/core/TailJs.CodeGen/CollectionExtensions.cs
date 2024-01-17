using System.CodeDom.Compiler;

namespace TailJs.CodeGen;

public static class CollectionExtensions
{
  public static IndentedTextWriter Indent(this IndentedTextWriter writer)
  {
    ++writer.Indent;
    return writer;
  }

  public static IndentedTextWriter Outdent(this IndentedTextWriter writer)
  {
    --writer.Indent;
    return writer;
  }

  public static T Append<T>(this T writer, string? text) where T : TextWriter
  {
    if (!string.IsNullOrEmpty(text))
    {
      writer.Write(text);
    }

    return writer;
  }

  public static T AppendLine<T>(this T writer, string? text = "") where T : TextWriter
  {
    if (text != null)
    {
      writer.WriteLine(text);
    }

    return writer;
  }

  public static T AppendLineIf<T>(this T writer, bool appendLine) where T : TextWriter =>
    writer.AppendLine(appendLine ? "" : null);

  public static IEnumerable<(int Index, T Item)> Rank<T>(this IEnumerable<T> items) =>
    items.Select((item, index) => (index, item));

  public static IEnumerable<T> NotNull<T>(this IEnumerable<T?> items) where T : notnull
  {
    foreach (var item in items.Where(item => item != null))
    {
      yield return item!;
    }
  }

  public static IEnumerable<T> Expand<T>(this IEnumerable<T> items, Func<T, IEnumerable<T>?> expansion) =>
    items.Expand(expansion, item => item);

  public static IEnumerable<T> Expand<T, TKey>(
    this IEnumerable<T> items,
    Func<T, IEnumerable<T>?> expansion,
    Func<T, TKey> keySelector
  )
  {
    var seen = new HashSet<TKey>();
    return Inner(items);

    IEnumerable<T> Inner(IEnumerable<T> items)
    {
      foreach (var item in items.Where(item => seen.Add(keySelector(item))))
      {
        // Depth first.
        if (expansion.Invoke(item) is { } expanded)
        {
          foreach (var expandedItem in Inner(expanded))
          {
            yield return expandedItem;
          }
        }

        yield return item;
      }
    }
  }
}
