using Application.Jobs;
using FastEndpoints;

namespace Jobs.Complex;

/// <summary>
/// Response containing the current status of a complex job
/// </summary>
public sealed class ComplexJobStatusResponse
{
  /// <summary>
  /// The tracking ID of the job
  /// </summary>
  public Guid TrackingId { get; set; }

  /// <summary>
  /// Whether the job has completed
  /// </summary>
  public bool IsComplete { get; set; }

  /// <summary>
  /// Current step number
  /// </summary>
  public int CurrentStep { get; set; }

  /// <summary>
  /// Total number of steps
  /// </summary>
  public int TotalSteps { get; set; }

  /// <summary>
  /// Current status message
  /// </summary>
  public string Status { get; set; } = "Pending";

  /// <summary>
  /// The job result (contains progress details while in-progress, final result when complete)
  /// </summary>
  public ComplexJobResult? Result { get; set; }
}

/// <summary>
/// Endpoint to check the status of a complex job
/// </summary>
public sealed class HandleComplexJobStatusGet(
  ILogger<HandleComplexJobStatusGet> logger,
  JobStorageProvider jobStorage
) : EndpointWithoutRequest<ComplexJobStatusResponse>
{
  private readonly ILogger<HandleComplexJobStatusGet> logger = logger;
  private readonly JobStorageProvider jobStorage = jobStorage;

  public override void Configure()
  {
    Get("/jobs/complex/{trackingId:guid}");
    AllowAnonymous();
  }

  public override async Task HandleAsync(CancellationToken ct)
  {
    var trackingId = Route<Guid>("trackingId");

    // First check if the job exists in storage
    var jobRecord = await jobStorage.GetJobRecordAsync(trackingId, ct);
    if (jobRecord is null)
    {
      logger.LogDebug("Job {TrackingId}: Not found", trackingId);
      await SendNotFoundAsync(ct);
      return;
    }

    // use jobRecord directly, not JobTracker
    var jobResult = jobRecord.GetResult<JobResult<ComplexJobResult>>();

    if (jobResult is null)
    {
      logger.LogDebug("Job {TrackingId}: Execution hasn't begun yet", trackingId);

      await SendAsync(new ComplexJobStatusResponse
      {
        TrackingId = trackingId,
        IsComplete = false,
        CurrentStep = 0,
        TotalSteps = 0,
        Status = "Pending"
      }, cancellation: ct);
      return;
    }

    logger.LogDebug("Retrieved status for job {TrackingId}: IsComplete={IsComplete}, Step={Step}/{Total}",
      trackingId, jobResult.IsComplete, jobResult.CurrentStep, jobResult.TotalSteps);

    await SendAsync(new ComplexJobStatusResponse
    {
      TrackingId = trackingId,
      IsComplete = jobResult.IsComplete,
      CurrentStep = jobResult.CurrentStep,
      TotalSteps = jobResult.TotalSteps,
      Status = jobResult.CurrentStatus ?? "Processing",
      Result = jobResult.Result
    }, cancellation: ct);
  }
}
