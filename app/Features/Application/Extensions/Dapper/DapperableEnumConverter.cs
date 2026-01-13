using System.Text.Json;
using System.Text.Json.Serialization;


namespace Application.Estensions.Dapper;

public class DapperableEnumConverter : JsonConverterFactory
{
  public override bool CanConvert(Type typeToConvert)
  {
    if (!typeToConvert.IsGenericType)
    {
      return false;
    }

    if (typeToConvert.GetGenericTypeDefinition() != typeof(DapperableEnum<>))
    {
      return false;
    }

    return typeToConvert.GetGenericArguments()[0].IsEnum;
  }

  public override JsonConverter CreateConverter(Type type, JsonSerializerOptions options)
  {
    // Get the underlying type to handle nullable enums correctly
    Type genericType = type.GetGenericArguments()[0];

    // Create an instance of the generic CustomEnumConverter<T>
    var converter = (JsonConverter)Activator.CreateInstance(
      typeof(DapperableEnumConvertorInner<>).MakeGenericType(genericType))!;

    return converter;
  }

  private class DapperableEnumConvertorInner<T> : JsonConverter<DapperableEnum<T>> where T : struct, Enum
  {
    public override DapperableEnum<T> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
      if (reader.TokenType != JsonTokenType.String)
      {
        throw new JsonException();
      }

      string? value = reader.GetString();
      if (value == null)
      {
        throw new JsonException($"Null value not allowed for enum \"{typeToConvert.Name}\".");
      }

      // Example: Use Enum.Parse (case insensitive)
      if (Enum.TryParse<T>(value, ignoreCase: true, out T result))
      {
        return (DapperableEnum<T>)result;
      }

      throw new JsonException($"Unable to convert \"{value}\" to enum \"{typeToConvert.Name}\".");
    }

    public override void Write(Utf8JsonWriter writer, DapperableEnum<T> value, JsonSerializerOptions options)
    {
      // Use the default ToString() for the enum name or implement custom logic
      writer.WriteStringValue(value.ToString());
    }
  }
}
