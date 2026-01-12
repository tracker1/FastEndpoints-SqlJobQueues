using FastEndpoints;

namespace Jobs.Simple;

public sealed class SimpleCommand : ICommand<SimpleCommandResult>
{
    public string Message { get; set; } = string.Empty;
}

public sealed class SimpleCommandResult
{
    public string Echo { get; set; } = string.Empty;
}
