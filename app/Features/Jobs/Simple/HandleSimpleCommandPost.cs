using FastEndpoints;

namespace Jobs.Simple;

public sealed class SimpleCommandRequest
{
    public string Message { get; set; } = string.Empty;
}

public sealed class HandleSimpleCommandPost(ILogger<HandleSimpleCommandPost> logger) : Endpoint<SimpleCommandRequest, SimpleCommandResult>
{
    private readonly ILogger<HandleSimpleCommandPost> logger = logger;

    public override void Configure()
    {
        Post("/jobs/simple");
        AllowAnonymous();
    }

    public override async Task HandleAsync(SimpleCommandRequest req, CancellationToken ct)
    {
        var command = new SimpleCommand { Message = req.Message };
        var result = await command.ExecuteAsync();

        await SendAsync(result, cancellation: ct);
    }
}
