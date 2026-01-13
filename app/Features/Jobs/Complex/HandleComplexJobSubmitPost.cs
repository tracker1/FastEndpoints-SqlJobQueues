using FastEndpoints;

namespace Jobs.Complex;

/// <summary>
/// Request to submit a complex job for async processing
/// </summary>
public sealed class ComplexJobSubmitRequest
{
  /// <summary>
  /// List of todo items to be processed asynchronously
  /// </summary>
  public List<string> TodoItems { get; set; } = [];

  /// <summary>
  /// If true, skip the delays during processing (useful for testing)
  /// </summary>
  public bool? SkipWait { get; set; }
}

/// <summary>
/// Response containing the tracking ID for the submitted job
/// </summary>
public sealed class ComplexJobSubmitResponse
{
  /// <summary>
  /// Unique tracking ID to check job status
  /// </summary>
  public Guid TrackingId { get; set; }

  /// <summary>
  /// Message indicating the job was submitted
  /// </summary>
  public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Endpoint to submit a complex job for async processing
/// </summary>
public sealed class HandleComplexJobSubmitPost(
  ILogger<HandleComplexJobSubmitPost> logger
) : Endpoint<ComplexJobSubmitRequest, ComplexJobSubmitResponse>
{
  private readonly ILogger<HandleComplexJobSubmitPost> logger = logger;

  public override void Configure()
  {
    Post("/jobs/complex");
    AllowAnonymous();
  }

  public override async Task HandleAsync(ComplexJobSubmitRequest req, CancellationToken ct)
  {
    if (req.TodoItems.Count == 0)
    {
      AddError("TodoItems", "At least one todo item is required");
      await SendErrorsAsync(cancellation: ct);
      return;
    }

    // Queue the job for async processing and get the tracking ID
    var trackingId = await new ComplexJob
    {
      TodoItems = req.TodoItems,
      SkipWait = req.SkipWait
    }.QueueJobAsync(ct: ct);

    logger.LogInformation("Queued complex job with TrackingID {TrackingId} containing {Count} items",
      trackingId, req.TodoItems.Count);

    await SendCreatedAtAsync<HandleComplexJobStatusGet>(
      routeValues: new { trackingId },
      responseBody: new ComplexJobSubmitResponse
      {
        TrackingId = trackingId,
        Message = $"Job queued successfully with {req.TodoItems.Count} items to process"
      },
      cancellation: ct);
  }
}
