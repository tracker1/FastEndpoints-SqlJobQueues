using System.Data;
using System.Text.Json.Nodes;
using Dapper;

namespace Application.Extensions.Data;

public class JsonNodeTypeHandler : SqlMapper.TypeHandler<JsonNode>
{
  // Called when pushing data to the database
  public override void SetValue(IDbDataParameter parameter, JsonNode? value)
  {
    parameter.Value = value == null ? "{}" : value.ToJsonString();
    parameter.DbType = DbType.String; // Ensure the DB type is string/varchar/text
  }

  // Called when reading data from the database
  public override JsonNode Parse(object value)
  {
    return (value == null || value is DBNull)
      ? new JsonObject()
      : JsonNode.Parse(value?.ToString() ?? "{}") ?? new JsonObject();
  }
}
