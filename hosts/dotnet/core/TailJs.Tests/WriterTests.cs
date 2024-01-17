using TailJs.IO;

namespace TailJs.Tests;

public class WriterTests
{
  [Theory]
  [InlineData("<div>Test</div>", "<div _t=value>Test</div>")]
  [InlineData("<div><div>Test</div></div>", "<div _t=value><div>Test</div></div>")]
  [InlineData("<div>Test</div><div>Test</div>", "<div _t=value>Test</div><div _t>Test</div>")]
  [InlineData("<div/>", "<div _t=value/>")]
  [InlineData("<div />", "<div _t=value/>")]
  [InlineData("<div   />", "<div   _t=value/>")]
  [InlineData("<a href=\"http://test.com\">Test</a>", "<a href=\"http://test.com\" _t=value>Test</a>")]
  public Task ItAddsAttributes(string source, string expected) => TestSyncAndAsync(source, expected);

  [Theory]
  [InlineData("<div _t=x>Test</div>", "<div _t=x|value>Test</div>")]
  [InlineData("<div _t=>Test</div>", "<div _t=value>Test</div>")]
  [InlineData("<div _t>Test</div>", "<div _t=value>Test</div>")]
  [InlineData("<div _t/>", "<div _t=value/>")]
  [InlineData("<div a=0 _t=9>Test</div>", "<div a=0 _t=9|value>Test</div>")]
  [InlineData("<div _t=''/>", "<div _t='value'/>")]
  [InlineData("<div _t/>", "<div _t='value&#39;\"'/>", "value'\"")]
  [InlineData("<div _t/>", "<div _t='\"Hello'/>", "\"Hello")]
  [InlineData("<div _t/>", "<div _t={Hello}/>", "{Hello}")]
  [InlineData("<div _t/>", "<div _t='\"Hello\"'/>", "\"Hello\"")]
  public Task ItMergesAttributes(string source, string expected, string? value = null) =>
    TestSyncAndAsync(source, expected, value);

  [Theory]
  [InlineData("<", "<")]
  [InlineData("<div>Test</div>", "<div>Test</div>")]
  [InlineData("Test", "Test")]
  public Task ItDoesNothingWhenNoScope(string source, string expected) =>
    TestSyncAndAsync((_, write) => write(source), expected);

  [Theory]
  [InlineData("Test", "<wbr _t=value>Test")]
  [InlineData("<div>Test</div>Test", "<div _t=value>Test</div>Test")]
  [InlineData("Test<div>Test</div>Test", "<wbr _t=value>Test<div _t>Test</div>Test")]
  public Task ItAddsTextMarkers(string source, string expected) => TestSyncAndAsync(source, expected);

  [Theory]
  [InlineData("<!-- <div>test</div> -->", "<!-- <div>test</div> -->")]
  [InlineData("<script />Abc", "<script /><wbr _t=value>Abc")]
  [InlineData("<div><!-- <div>test --></div>", "<div _t=value><!-- <div>test --></div>")]
  [InlineData("<script><div></script>", "<script><div></script>")]
  [InlineData("<script></script><div></div>", "<script></script><div _t=value></div>")]
  [InlineData("   <style>*{}<script><!--</style>", "   <style>*{}<script><!--</style>")]
  [InlineData("<!DOCTYPE html><html lang='en'></html>", "<!DOCTYPE html><html lang='en'></html>")]
  public Task ItSkipsNonHtml(string source, string expected) => TestSyncAndAsync(source, expected);

  [Fact]
  public Task ItHandlesNestedAttributeScopes() =>
    TestSyncAndAsync(
      async (writer, write) =>
      {
        await write("<div>");
        var scope1 = writer.BeginScope("value1");
        await write("<div>Item 1</div>");
        var scope2 = writer.BeginScope("value2");
        await write("<div>Item 2</div>");
        var scope3 = writer.BeginScope("value3");
        await write("<div>");
        scope2.End();
        await write("Item 3");
        var scope4 = writer.BeginScope("value4");
        await write("<div>Item 3.1</div>");
        scope4.End();
        await write("</div>");
        await write("<div>Item 4</div>");
        scope3.End();
        await write("<div>Item 5</div>");
        scope1.End();
        await write("</div>");
      },
      "<div><div _t=value1>Item 1</div><div _t=|value2>Item 2</div><div _t=|value3>Item 3<div _t=value4>Item 3.1</div></div><div _t=->Item 4</div><div _t=->Item 5</div></div>"
    );

  [Fact]
  public Task ItBase36Encodes() =>
    TestSyncAndAsync(
      async (writer, write) =>
      {
        var scopes = new Stack<IDisposable>();
        for (var i = 0; i <= 15; i++)
        {
          scopes.Push(writer.BeginScope(i.ToString()));
        }

        await write("<div />");
        while (scopes.Count > 1)
        {
          scopes.Pop().Dispose();
        }

        await write("<div />");
      },
      "<div _t=0|1|2|3|4|5|6|7|8|9|a|b|c|d|e|f/><div _t=-f/>",
      compress: true
    );

  [Fact]
  public Task ItHandlesSiblingAttributeScopes() =>
    TestSyncAndAsync(
      async (writer, write) =>
      {
        await write("<div>");
        var scope1 = writer.BeginScope("value1");
        await write("<div>Item 1</div>");
        var scope2 = writer.BeginScope("value2");
        await write("<div>Item 2</div>");
        scope2.End();
        var scope3 = writer.BeginScope("value3");
        var scope4 = writer.BeginScope("{\"value\":4}");
        await write("<div>Item 3</div>");
        scope4.End();
        scope3.End();
        await write("<div>Item 4</div>");
        scope1.End();
        await write("<div>Item 5</div>");
        await write("</div>");
      },
      "<div><div _t=value1>Item 1</div><div _t=|value2>Item 2</div><div _t='-|value3|{\"value\":4}'>Item 3</div><div _t=-2>Item 4</div><div>Item 5</div></div>"
    );

  [Fact]
  public Task ItHandlesNestedWriters() =>
    TestSyncAndAsync(
      async (writer, write) =>
      {
        var wrapper = new ForwardingWriter(writer);
        var scope1 = writer.BeginScope("value");
        writer.PushWriter(wrapper);
        await write("<div></div>");
        scope1.End();
      },
      "<div _t=value></div>"
    );

  [Theory]
  [InlineData(
    "<!--@scope:value--><div>Test</div><!--@scope:pop-->",
    "<div _t=value>Test</div>",
    false,
    false
  )]
  [InlineData(
    "<!--@scope:value--><!--@scope:value2--><!--@scope:value3--><div>Test</div><!--@scope:pop--><!--@scope:pop--><div>Test 2</div>Test<!--@scope:pop-->Test",
    "<div _t=value|value2|value3>Test</div><div _t=-2>Test 2</div>Test<wbr _t>Test",
    false,
    false
  )]
  [InlineData(
    "<!--@scope:value--><html><head><title>Test</title></head><body></body></html><!--@scope:pop-->",
    "<html><head><title>Test</title></head><body _t=value></body></html>",
    true,
    false
  )]
  [InlineData(
    "<!--@scope:value--><html><head><title>Test</title></head><body></body></html><!--@scope:pop-->",
    "<html><head><title>Test</title></head><body _t=value></body></html>",
    false,
    true
  )]
  [InlineData(
    "<!--@scope:value--><html><head><title>Test</title></head><body><div /></body></html><!--@scope:pop-->",
    "<html><head><title>Test</title></head><body _t=value><div /></body></html>",
    true,
    true
  )]
  [InlineData(
    "<!--@scope:value01--><!--@scope:value02--><!doctype html><html lang=\"en\"><head><title>Test</title></head><body><!--@scope:value11--><!--@scope:value12--><div></div><!--@scope:pop--><!--@scope:pop--></body></html><!--@scope:pop--><!--@scope:pop-->",
    "<!doctype html><html lang=\"en\"><head><title>Test</title></head><body><div _t=value11|value12></div></body></html>",
    false,
    false
  )]
  [InlineData(
    "<!--@scope:value--><div /><!--@scope:pop--><!--@scope:pop--><div />",
    "<div _t=value/><!--Invalid pop marker: No current scope.--><div />",
    false,
    false
  )]
  [InlineData(
    "<!--@scope:value01--><!--@scope:value02--><!doctype html><html lang=\"en\"><head><title>Test</title></head><body><!--@scope:value11--><!--@scope:value12--><div></div><!--@scope:pop--><!--@scope:pop--></body></html><!--@scope:pop--><!--@scope:pop-->",
    "<!doctype html><html lang=\"en\"><head><title>Test</title></head><body _t=value01|value02><div _t=value11|value12></div></body></html>",
    true,
    false
  )]
  [InlineData(
    "<!--@scope:value--><span>Test</span>Test<!--@scope:pop-->Test",
    "<span _t=value>Test</span>Test<wbr _t>Test",
    false,
    false
  )]
  [InlineData( // Data larger than initial buffer.
    """
    <!--@scope:  {"component":{"typeName":"Blogpost","id":"782c631b-11e9-4e90-8fc1-6aeff37b488a","name":"My Blog Post","path":"-1,1102,1127,1128"}}--><a href="/blog/my-blog-post/" class="blogpost" tail-tags="list:blog"><!--@scope:pop-->
    """,
    """
    <a href="/blog/my-blog-post/" class="blogpost" tail-tags="list:blog" _t='{"component":{"typeName":"Blogpost","id":"782c631b-11e9-4e90-8fc1-6aeff37b488a","name":"My Blog Post","path":"-1,1102,1127,1128"}}'>
    """,
    false,
    false
  )]
  public Task ItHandlesScopeDataMarkers(
    string source,
    string expected,
    bool ignoreRootScope,
    bool htmlToBody
  ) =>
    TestSyncAndAsync(
      (writer, write) =>
      {
        if (ignoreRootScope)
        {
          writer.IgnoreNextScope();
        }

        return write(source);
      },
      expected,
      false,
      htmlToBody
    );

  public Task ItEscapesScopeDataEndMarkersInData() =>
    TestSyncAndAsync(
      async (writer, write) =>
      {
        await write(writer.GetScopeDataHeader("Value-->"));
        await write("<div />");
        await write(writer.GetScopeDataFooter());
      },
      "<div _t='Value-->' />"
    );

  [Theory]
  [InlineData("10<20 or 20>10 or 10 < a", "<wbr _t=value>10<20 or 20>10 or 10 < a")]
  public Task ItAcceptsUnencodedBrackets(string source, string expected) =>
    TestSyncAndAsync(source, expected);

  [Fact]
  public Task ItInjectsBeforeBodyEnd() =>
    TestSyncAndAsync("<body>Test</body>", "<body _t=value>TestEOB</body>");

  private Task TestSyncAndAsync(string source, string expected, string? value = null) =>
    TestSyncAndAsync(
      async (writer, write) =>
      {
        using var scope = writer.BeginScope(value ?? "value");
        await write(source);
      },
      expected
    );

  private async Task TestSyncAndAsync(
    UseWriterDelegate useWriter,
    string expected,
    bool injectEob = true,
    bool htmlToBody = false,
    bool compress = false
  )
  {
    for (var chunkSize = 0; chunkSize < 17; chunkSize++)
    {
      // Sync
      var output = new StringWriter();
      var neo = new DataMarkupWriter(
        new()
        {
          AttributeName = "_t",
          EndOfBodyContent = _ => injectEob ? "EOB" : null,
          IgnoreHtmlScope = htmlToBody,
          UseReferences = compress
        }
      ).PushWriter(output);
      await useWriter(
        neo,
        text =>
        {
          if (chunkSize == 0)
          {
            neo.Write(text);
          }
          else if (chunkSize == 1)
          {
            foreach (var p in text)
            {
              neo.Write(p);
            }
          }
          else
          {
            var span = text.AsSpan();
            while (span.Length > 0)
            {
              var n = Math.Min(span.Length, chunkSize);
              neo.Write(span[..n]);
              span = span[n..];
            }
          }

          neo.EndWrite();
          return default;
        }
      );

      Assert.Equal(expected, output.ToString());
      // Now async
      output = new StringWriter();
      neo.Reset(output);
      await useWriter(
        neo,
        async (text) =>
        {
          if (chunkSize == 0)
          {
            await neo.WriteAsync(text);
          }
          else
          {
            var span = text.AsMemory();
            while (span.Length > 0)
            {
              var n = Math.Min(span.Length, chunkSize);
              await neo.WriteAsync(span[..n]);
              span = span[n..];
            }
          }

          await neo.EndWriteAsync();
        }
      );
      Assert.Equal(expected, output.ToString());
    }
  }

  #region Nested type: UseWriterDelegate

  private delegate ValueTask UseWriterDelegate(DataMarkupWriter writer, Func<string, ValueTask> write);

  #endregion
}
