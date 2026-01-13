using System.Text.Json.Serialization;
using Dapper;

namespace Application.Estensions.Dapper
{

  public readonly struct DapperableEnum<TEnum> where TEnum : struct, Enum
  {
  private static Dictionary<Type, bool> map = new Dictionary<Type, bool>();

  [JsonConverter(typeof(JsonStringEnumConverter))]
  public TEnum Value { get; }

  static DapperableEnum()
  {
    SqlMapper.AddTypeHandler(typeof(DapperableEnum<TEnum>), new DapperableEnumHandler<TEnum>());
  }

  public DapperableEnum(TEnum value)
  {
    Value = value;
  }
  public DapperableEnum(string name)
  {
    if (Enum.TryParse<TEnum>(name, false, out TEnum result))
    {
    Value = result;
    return;
    }
    Value = default(TEnum);
  }

  public static implicit operator DapperableEnum<TEnum>(TEnum v) => new DapperableEnum<TEnum>(v);
  public static implicit operator TEnum(DapperableEnum<TEnum> v) => v.Value;
  public static implicit operator DapperableEnum<TEnum>(string s) => new DapperableEnum<TEnum>(s);
  public override string ToString() => Value.ToString();
  }
}