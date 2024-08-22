using Microsoft.ClearScript;
using TailJs.Variables;

namespace TailJs.Scripting;

internal static class VariableScriptExtensions
{
  internal static object? ToScriptValue(this JsonNodeConverter json, VariablePatchResult? result) =>
    result == null
      ? Undefined.Value
      : new
      {
        classification = (int?)result.Classification,
        purposes = (int?)result.Purposes,
        value = json.ConvertToScriptValue(result.Value),
        tags = result.Tags
      };

  internal static object? ToScriptValue(
    this JsonNodeConverter json,
    IVariableSetter? setter,
    CancellationToken cancellationToken = default
  )
  {
    if (setter == null)
      return Undefined.Value;

    var scriptSetter = new
    {
      scope = (int)setter.Scope,
      key = setter.Key,
      targetId = setter.TargetId,
      value = setter switch
      {
        VariableSetter typed => json.ToScriptValue(typed),
        VariableAddPatch typed => json.ToScriptValue(typed),
        VariableMinMaxPatch typed => json.ToScriptValue(typed),
        VariableConditionalPatch typed => json.ToScriptValue(typed),
        _ => Undefined.Value
      },
      classification = (int?)(setter as IVariableUsageWithDefaults)?.Classification,
      purposes = (int?)(setter as IVariableUsageWithDefaults)?.Purposes,
      tags = (setter as IVariableMetadata)?.Tags,
      ttl = (int?)((setter as IVariableMetadata)?.TimeToLive?.TotalMilliseconds),
      force = (setter as VariableSetter)?.Force,
      patch = setter is VariablePatchAction action
        ? PromiseLike.Wrap(
          async (current) =>
            json.ToScriptValue(
              await action.Patch(json.ParseVariableFragment(current) as Variable, cancellationToken)
            )
        )
        : (object?)(setter as VariableValuePatch)?.Type,
      seed = (setter as VariableAddPatch)?.Seed,
      match = (setter as VariableConditionalPatch)?.Match,
      __net__IVariableSetter = setter
    };

    return scriptSetter;
  }

  internal static object? ToScriptValue(this JsonNodeConverter json, IVariableKey? variable) =>
    variable == null
      ? Undefined.Value
      : new
      {
        scope = (int)variable.Scope,
        key = variable.Key,
        targetId = variable.TargetId
      };

  internal static object? ToScriptValue(this JsonNodeConverter json, IVariableHeader? variable) =>
    variable == null
      ? Undefined.Value
      : json.Combine(
        json.ToScriptValue((IVariableKey)variable),
        new
        {
          scope = (int)variable.Scope,
          key = variable.Key,
          targetId = variable.TargetId,
          classification = (int)variable.Classification,
          purposes = (int)variable.Purposes,
          created = json.ConvertToScriptValue(variable.Created),
          modified = json.ConvertToScriptValue(variable.Modified),
          accessed = json.ConvertToScriptValue(variable.Accessed),
          version = variable.Version,
          tags = variable.Tags,
          ttl = (int?)variable.TimeToLive?.TotalMilliseconds
        }
      );

  internal static object? ToScriptValue(this JsonNodeConverter json, IVariable? variable) =>
    variable == null
      ? Undefined.Value
      : json.Combine(
        json.ToScriptValue((IVariableHeader)variable),
        new { value = json.ConvertToScriptValue(variable.Value), }
      );

  public static object? ToScriptValue(this JsonNodeConverter json, IVariableGetResult? variable) =>
    variable == null
      ? Undefined.Value
      : json.Combine(
        new { status = (int)variable.Status },
        variable switch
        {
          VariableGetSuccessResult success => json.ToScriptValue((IVariable)success),
          VariableGetErrorResult error
            => json.Combine(
              json.ToScriptValue((IVariableKey)error),
              new { error = json.ConvertToScriptValue(error.Error) }
            ),
          _ => throw new ArgumentOutOfRangeException(nameof(variable))
        }
      );

  private static object? GetScriptSetterSource(this IVariableSetter setter) =>
    setter switch
    {
      VariablePatchAction variablePatchAction => variablePatchAction.ScriptSource,
      VariableSetter variableSetter => variableSetter.ScriptSource,
      VariableValuePatch variableValuePatch => variableValuePatch.ScriptSource,
      _ => throw new ArgumentOutOfRangeException(nameof(setter))
    };

  public static object? ToScriptValue(this JsonNodeConverter json, IVariableSetResult? result) =>
    result == null
      ? Undefined.Value
      : result switch
      {
        VariableSetConflictResult conflict
          => new
          {
            status = result.Status,
            source = result.Source.GetScriptSetterSource(),
            error = json.ConvertToScriptValue(conflict.Error),
            current = json.ToScriptValue(conflict.Current)
          },
        VariableSetErrorResult error
          => new
          {
            status = result.Status,
            source = result.Source.GetScriptSetterSource(),
            error = json.ConvertToScriptValue(error.Error),
            transient = error.Transient
          },
        VariableSetSuccessResult success
          => new
          {
            status = result.Status,
            source = result.Source.GetScriptSetterSource(),
            current = json.ToScriptValue(success.Current)
          },
        _ => throw new ArgumentOutOfRangeException(nameof(result))
      };

  public static VariableHeadResults ParseVariableHeadResults(this JsonNodeConverter json, object results) =>
    new(
      results.TryGetScriptInteger(),
      results.EnumerateScriptValues(result => (IVariableHeader)json.ParseVariableFragment(result)!).ToList(),
      results.GetScriptValue<string>()
    );

  public static VariableQueryResults ParseVariableQueryResults(this JsonNodeConverter json, object results) =>
    new(
      results.TryGetScriptInteger(),
      results.EnumerateScriptValues(result => (IVariable)json.ParseVariableFragment(result)!).ToList(),
      results.GetScriptValue<string>()
    );

  public static object? ToScriptValue<T>(this JsonNodeConverter json, IVariableQueryResults<T>? results)
    where T : IVariableHeader =>
    results == null
      ? Undefined.Value
      : new
      {
        count = results.Count,
        results = results
          .Results.Select(result =>
            result is IVariable variable ? json.ToScriptValue(variable) : json.ToScriptValue(result)
          )
          .ToArray(),
        cursor = results.Cursor
      };

  public static VariableClassificationFilter? ParseVariableClassificationFilter(
    this JsonNodeConverter json,
    object? filter
  )
  {
    if (filter == null || filter == Undefined.Value)
      return null;

    return new VariableClassificationFilter(
      (DataClassification?)filter.GetScriptValue("min"),
      (DataClassification?)filter.GetScriptValue("max"),
      filter
        .EnumerateScriptValues("levels")
        .Select(item => (DataClassification)item.RequireScriptInteger())
        .ToList()
    );
  }

  public static object ToScriptValue(this JsonNodeConverter json, VariableFilter filter) =>
    new
    {
      targetIds = json.ConvertToScriptValue(filter.TargetIds),
      scopes = json.ConvertToScriptValue(filter.Scopes?.Select(scope => (int)scope)),
      keys = json.ConvertToScriptValue(filter.Keys),
      tags = json.ConvertToScriptValue(filter.Tags?.Select(json.ConvertToScriptValue)),
      classification = filter.Classification is { } classification
        ? new
        {
          min = json.ConvertToScriptValue((int?)classification.Min),
          max = json.ConvertToScriptValue((int?)classification.Max),
          levels = json.ConvertToScriptValue(classification.Levels?.Select(level => (int)level))
        }
        : (object)Undefined.Value
    };

  public static VariableFilter? ParseVariableFilter(this JsonNodeConverter json, object? filter)
  {
    if (filter == null || filter == Undefined.Value)
    {
      return null;
    }

    return new VariableFilter(
      json.GetScriptArray<string>("targetIds"),
      json.EnumerateScriptValues("scopes")
        .Select(id => (VariableScope)(long)id.TryGetScriptInteger()!)
        .ToArray(),
      json.GetScriptArray<string>("keys"),
      json.EnumerateScriptValues("tags").Select(id => id.GetScriptArray<string>()!).ToArray(),
      json.ParseVariableClassificationFilter("classification"),
      (DataPurposes?)json.TryGetScriptInteger("purposes")
    );
  }

  public static object ToScriptValue(this JsonNodeConverter json, VariableQueryOptions options) =>
    new
    {
      count = options.Count,
      top = options.Top,
      cursor = options.Cursor is { } cursor
        ? (object)new { include = cursor.Include, previous = cursor.Previous }
        : Undefined.Value,
      ifModifiedSince = json.ConvertToScriptValue(options.IfModifiedSince),
      ifNoneMatch = options.IfNoneMatch?.Select(json.ToScriptValue).ToArray()
    };

  public static VariableQueryOptions ParseQueryOptions(this JsonNodeConverter json, object? options)
  {
    options = options.GetScriptValue();
    if (options == null)
      return new();

    return new(
      options.TryGetScriptValue<bool>("count") == true,
      options.TryGetScriptInteger("top"),
      options.GetScriptValue("cursor") is { } cursor
        ? new VariableQueryCursorOptions(
          cursor.GetScriptValue<string?>("previous"),
          cursor.TryGetScriptValue<bool>() == true
        )
        : null,
      options.TryGetScriptDateTime("ifModifiedSince"),
      options
        .EnumerateScriptValues("ifNoneMatch")
        .Select(item => json.RequireVariableFragment<IVersionedVariableKey>(item)!)
        .ToList()
    );
  }

  public static T? RequireVariableFragment<T>(this JsonNodeConverter json, object? variable)
    where T : IVariableKey =>
    json.ParseVariableFragment(variable) switch
    {
      null => default(T),
      var key
        => key is T required ? required : throw new InvalidOperationException($"{typeof(T).Name} expected."),
    };

  public static IPartialVariable? ParseVariableFragment(this JsonNodeConverter json, object? variable)
  {
    if (variable == Undefined.Value || variable == null)
      return null;
    if (variable is not IScriptObject source)
      throw new InvalidOperationException("A script object was expected.");

    var scope = (VariableScope)source.RequireScriptValue<int>("scope");
    var key = source.RequireScriptValue<string>("key");
    var targetId = source.GetScriptValue<string?>("targetId");
    var version = source.GetScriptValue<string?>("version");
    var classification = (DataClassification?)source.TryGetScriptInteger("classification");
    var purposes = (DataPurposes?)source.TryGetScriptInteger("purposes");
    var tags = source.GetScriptArray<string>("tags");
    var ttl = source.TryGetTimeSpan("ttl");
    var value = json.ConvertFromScriptValue(source.GetScriptValue("value"));

    if (classification == null || purposes == null)
    {
      return new PartialVariable(scope, key, targetId, classification, purposes, version, value, tags, ttl);
    }

    return new Variable(
      scope,
      key,
      targetId,
      classification.Value,
      purposes.Value,
      source.RequireScriptDateTime("created"),
      source.RequireScriptDateTime("modified"),
      source.RequireScriptDateTime("accessed"),
      source.RequireScriptValue<string>("version"),
      json.ConvertFromScriptValue(source.GetScriptValue("value")),
      source.GetScriptArray<string>("tags"),
      source.TryGetTimeSpan("ttl")
    );
  }

  public static VariableGetter? ParseVariableGetter(this JsonNodeConverter json, object? getter) =>
    getter == null || getter == Undefined.Value
      ? null
      : new VariableGetter(
        (VariableScope)getter.GetScriptValue<int>(),
        getter.GetScriptValue<string>("key"),
        getter.GetScriptValue<string?>("targetId"),
        (DataPurposes?)getter.TryGetScriptValue<int>("purpose"),
        getter.GetScriptValue<string?>("version"),
        getter.TryGetScriptValue<bool>("refresh") == true,
        getter.GetScriptValue("initializer") is IScriptObject initializer
          ? async (cancellationToken) =>
            json.TryParseVariablePatchResult(
              await initializer.InvokeAsFunction().AwaitScript(cancellationToken)
            )
          : null
      );

  public static IVariableSetter? ParseVariableSetter(this JsonNodeConverter json, object? setter)
  {
    var header = json.ParseVariableFragment(setter);
    if (header == null)
      return null;

    if (setter.GetScriptValue("patch") is IScriptObject action)
    {
      return new VariablePatchAction(
        header.Scope,
        header.Key,
        header.TargetId,
        async (current, cancellationToken) =>
          json.TryParseVariablePatchResult(
            await action.InvokeAsFunction(json.ToScriptValue(current)).AwaitScript(cancellationToken)
          ),
        header.Classification,
        header.Purposes
      )
      {
        ScriptSource = setter
      };
    }

    return (VariablePatchType?)setter.TryGetScriptInteger("patch") is { } patchType
      ? patchType switch
      {
        VariablePatchType.Add
          => new VariableAddPatch(
            header.Scope,
            header.Key,
            header.TargetId,
            setter.RequireScriptDouble("value"),
            setter.TryGetScriptDouble("seed"),
            header.Classification,
            header.Purposes,
            header.Tags,
            header.TimeToLive
          )
          {
            ScriptSource = setter
          },
        VariablePatchType.Min
        or VariablePatchType.Max
          => new VariableMinMaxPatch(
            header.Scope,
            header.Key,
            header.TargetId,
            (decimal)setter.RequireScriptDouble("value"),
            patchType is VariablePatchType.Max,
            header.Classification,
            header.Purposes,
            header.Tags,
            header.TimeToLive
          )
          {
            ScriptSource = setter
          },
        VariablePatchType.IfMatch
        or VariablePatchType.IfNoneMatch
          => new VariableConditionalPatch(
            header.Scope,
            header.Key,
            header.TargetId,
            json.ConvertFromScriptValue("value"),
            json.ConvertFromScriptValue("match"),
            patchType == VariablePatchType.IfMatch,
            header.Classification,
            header.Purposes,
            header.Tags,
            header.TimeToLive
          )
          {
            ScriptSource = setter
          },
        _ => throw new ArgumentOutOfRangeException()
      }
      : new VariableSetter(
        header.Scope,
        header.Key,
        header.TargetId,
        header.Value,
        header.Classification,
        header.Purposes,
        header.Version,
        header.Tags,
        header.TimeToLive
      )
      {
        ScriptSource = setter
      };
    ;
  }

  public static VariablePatchResult? TryParseVariablePatchResult(
    this JsonNodeConverter json,
    object? result
  ) =>
    result is not IScriptObject
      ? null
      : new VariablePatchResult(
        json.ConvertFromScriptValue(result.GetScriptValue("value")),
        (DataClassification?)result.TryGetScriptValue<int>("classification"),
        (DataPurposes?)result.TryGetScriptValue<int>("purposes"),
        result.GetScriptValue<string[]>(),
        result.TryGetTimeSpan("ttl")
      );
}
