using Dapper;
using System.Data;
namespace Application.Extensions.Data;

public class DateOnlyTypeHandler : SqlMapper.TypeHandler<DateOnly> // Dapper handler for DateOnly
{
  public override DateOnly Parse(object value)
  {
    return DateOnly.FromDateTime((DateTime)value);
  }

  public override void SetValue(IDbDataParameter parameter, DateOnly value)
  {
    parameter.DbType = DbType.Date;
    parameter.Value = value;
  }
}
