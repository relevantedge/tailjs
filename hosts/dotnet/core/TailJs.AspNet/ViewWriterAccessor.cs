namespace TailJs.AspNet;

public class ViewWriterAccessor : IViewWriterAccessor
{
  public TextWriter? CurrentWriter { get; set; }
}
