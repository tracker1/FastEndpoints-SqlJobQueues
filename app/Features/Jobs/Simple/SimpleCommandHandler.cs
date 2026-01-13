using FastEndpoints;

namespace Jobs.Simple;

public sealed class SimpleCommandHandler(ILogger<SimpleCommandHandler> logger) : ICommandHandler<SimpleCommand, SimpleCommandResult>
{
  private readonly ILogger<SimpleCommandHandler> logger = logger;

  public Task<SimpleCommandResult> ExecuteAsync(SimpleCommand command, CancellationToken ct)
  {
    logger.LogInformation("SimpleCommandHandler received message: {Message}", command.Message);
    return Task.FromResult(new SimpleCommandResult
    {
      Echo = command.Message
    });
  }
}
