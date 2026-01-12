namespace Application.Extensions.Data;

internal class SqlErrorResultRaw
{
  public int Number { get; set; }
  public int Severity { get; set; }
  public int State { get; set; }
  public string Procedure { get; set; } = string.Empty;
  public int Line { get; set; }
  public string Message { get; set; } = string.Empty;
}

public class SqlErrorException(string message) : ApplicationException(message)
{
  public int Number { get; set; }
  public int Severity { get; set; }
  public int State { get; set; }
  public string Procedure { get; set; } = string.Empty;
  public int Line { get; set; }
  override public string StackTrace { get; } = String.Empty;

  public static SqlErrorException? FromJsonString(string json)
  {
    var input = JsonHelper.FromJson<SqlErrorResultRaw>(json);
    if (input == null) return null;
    var result = new SqlErrorException(input.Message);
    result.Number = input.Number;
    result.Severity = input.Severity;
    result.State = input.State;
    result.Procedure = input.Procedure;
    result.Line = input.Line;
    return result;
  }
}
