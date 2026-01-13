using Application.Extensions;
using Application.Jobs;
using FastEndpoints;
using YamlDotNet.Core.Tokens;

namespace Jobs.Complex;

public sealed class ComplexJobHandler(
    ILogger<ComplexJobHandler> logger,
    IJobTracker<ComplexJob> tracker
) : ICommandHandler<ComplexJob, JobResult<ComplexJobResult>>
{
    private readonly ILogger<ComplexJobHandler> logger = logger;
    private readonly IJobTracker<ComplexJob> tracker = tracker;

    public async Task<JobResult<ComplexJobResult>> ExecuteAsync(ComplexJob job, CancellationToken ct)
    {
        var itemCount = job.TodoItems.Count;
        var skipWait = job.SkipWait == true;

        logger.LogInformation("ComplexJobHandler starting with {Count} todo items (SkipWait: {SkipWait})", itemCount, skipWait);

        // Initialize the processed items dictionary with null values
        var processedItems = job.TodoItems.ToDictionary(item => item, _ => (DateTime?)null);

        // Initialize the result with status and dictionary from todo list
        // Total steps: 1 for starting + 1 per item
        var jobResult = new JobResult<ComplexJobResult>(totalSteps: itemCount + 1)
        {
            CurrentStatus = "Starting",
            CurrentStep = 1
            // Note: do not set Result, or the task will be marked complete.
        };

        // Save initial status with current result state
        await tracker.StoreJobResultAsync(job.TrackingID, jobResult, ct);
        logger.LogInformation("Job {TrackingId}: Set status to 'Starting'", job.TrackingID);

        // Wait 5 seconds after setting starting status (unless skipped)
        if (!skipWait)
        {
            await Task.Delay(TimeSpan.FromSeconds(5), ct);
        }

        // Process each item with 2 second delay
        for (var i = 0; i < job.TodoItems.Count; i++)
        {
            if (ct.IsCancellationRequested)
            {
                logger.LogWarning("Job {TrackingId}: Cancellation requested", job.TrackingID);
                break;
            }

            var item = job.TodoItems[i];

            // Wait 2 seconds before processing (unless skipped)
            if (!skipWait)
            {
                await Task.Delay(TimeSpan.FromSeconds(2), ct);
            }

            processedItems[item] = DateTime.UtcNow;
            jobResult.CurrentStep = i + 1;
            jobResult.CurrentStatus = $"Processed: {item}";

            await tracker.StoreJobResultAsync(job.TrackingID, jobResult, ct);
            logger.LogInformation("Job {TrackingId}: Processed item '{Item}' ({Step}/{Total})",
                job.TrackingID, item, jobResult.CurrentStep, jobResult.TotalSteps);
        }

        // Set final status
        jobResult.Result = new ComplexJobResult { TodoResult = processedItems };
        jobResult.CurrentStep = jobResult.TotalSteps;
        jobResult.CurrentStatus = "Complete";

        logger.LogInformation("Job {TrackingId}: Completed processing all items", job.TrackingID);

        return jobResult;
    }
}
