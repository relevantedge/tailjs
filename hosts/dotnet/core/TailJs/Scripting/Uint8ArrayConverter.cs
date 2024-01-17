using Microsoft.ClearScript;
using Microsoft.ClearScript.JavaScript;

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

  public ITypedArray<byte> FromBytes(byte[] data)
  {
    var uint8 = (ITypedArray<byte>)_factory.Invoke(false, data.Length);
    uint8.WriteBytes(data, 0, (ulong)data.Length, 0);
    return uint8;
  }
}
