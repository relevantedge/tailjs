using Microsoft.ClearScript;
using Microsoft.ClearScript.JavaScript;
using TailJs.IO;

namespace TailJs.Scripting;

public class Uint8ArrayConverter
{
  private readonly ScriptObject _factory;

  public Uint8ArrayConverter(IScriptEngine engine)
  {
    _factory = (ScriptObject)
      engine.Evaluate(
        """
            (function (length) {
                return new Uint8Array(length);
            }).valueOf()
        """
      );
  }

  public byte[] ToBytes(ITypedArray<byte> bytes) => bytes.ToArray();

  public ITypedArray<byte> FromBytes(byte[] data) => FromBytes(new ArraySegment<byte>(data));

  public ITypedArray<byte> FromBytes(ArraySegment<byte> data)
  {
    var uint8 = (ITypedArray<byte>)_factory.Invoke(false, data.Count);
    uint8.WriteBytes(data.Array, 0, (ulong)data.Count, 0);
    return uint8;
  }
}
