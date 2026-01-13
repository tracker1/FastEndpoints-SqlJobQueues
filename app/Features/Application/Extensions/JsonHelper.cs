using System.Text.Json;
using System.Text.Json.Serialization;
using Application.Estensions.Dapper;

namespace Application.Extensions;

public static class JsonHelper
{
  public static readonly JsonSerializerOptions DefaultOptions = new()
  {
    Converters = { new DapperableEnumConverter(), new JsonStringEnumConverter() },
    ReferenceHandler = ReferenceHandler.IgnoreCycles,
    WriteIndented = false,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
  };

  public static readonly JsonSerializerOptions PrettyOptions = new()
  {
    Converters = { new DapperableEnumConverter(), new JsonStringEnumConverter() },
    ReferenceHandler = ReferenceHandler.IgnoreCycles,
    WriteIndented = true,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
  };

  public static string ToJson<T>(T value)
  {
    return JsonSerializer.Serialize(value, DefaultOptions);
  }

  public static string ToJsonPretty<T>(T value)
  {
    return JsonSerializer.Serialize(value, PrettyOptions);
  }

  public static T? FromJson<T>(string? value)
  {
    if (string.IsNullOrEmpty(value))
      return default;

    return JsonSerializer.Deserialize<T>(value, DefaultOptions);
  }

  /// <summary>
  /// Configure JsonSerializerOptions with the application defaults
  /// </summary>
  public static void ConfigureDefaults(JsonSerializerOptions options)
  {
    options.Converters.Add(new DapperableEnumConverter());
    options.Converters.Add(new JsonStringEnumConverter());
    options.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.WriteIndented = false;
    options.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
  }
}
