namespace TailJs.AspNet;

public interface IViewWriterAccessor
{
  TextWriter? CurrentWriter { get; set; }
}
