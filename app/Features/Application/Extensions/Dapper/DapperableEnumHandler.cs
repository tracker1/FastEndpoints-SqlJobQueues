using Dapper;
using System.Data;

namespace Application.Estensions.Dapper;

public class DapperableEnumHandler<TEnum> : SqlMapper.ITypeHandler
  where TEnum : struct, Enum
{
  public object Parse(Type destinationType, object value)
  {
    if (destinationType == typeof(DapperableEnum<TEnum>))
    {
      return new DapperableEnum<TEnum>((string)value);
    }
    throw new InvalidCastException($"Can't parse string value {value} into enum type {typeof(TEnum).Name}");
  }

  public void SetValue(IDbDataParameter parameter, object value)
  {
    parameter.DbType = DbType.String;
    parameter.Value = ((DapperableEnum<TEnum>)value).Value.ToString();
  }
}
