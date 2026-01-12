using Dapper;
using System.Data;
namespace Application.Extensions.Data;

public class TimeOnlyTypeHandler : SqlMapper.TypeHandler<TimeOnly> // Dapper handler for TimeOnly
{
  public override TimeOnly Parse(object value)
  {
    if (value.GetType() == typeof(DateTime))
    {
      return TimeOnly.FromDateTime((DateTime)value);
    }
    if (value.GetType() == typeof(TimeSpan))
    {
      return TimeOnly.FromTimeSpan((TimeSpan)value);
    }
    return default;
  }

  public override void SetValue(IDbDataParameter parameter, TimeOnly value)
  {
    parameter.DbType = DbType.Time;
    parameter.Value = value;
  }
}
