using FastEndpoints;

namespace Jobs.Complex;

/// <summary>
/// Job for processing a todo list asynchronously with progress tracking
/// </summary>
public sealed class ComplexJob : ITrackableJob<JobResult<ComplexJobResult>>
{
    /// <summary>
    /// Tracking ID for the job (set by FastEndpoints)
    /// </summary>
    public Guid TrackingID { get; set; }

    /// <summary>
    /// List of todo items to process
    /// </summary>
    public List<string> TodoItems { get; set; } = [];

    /// <summary>
    /// If true, skip the delays during processing (useful for testing)
    /// </summary>
    public bool? SkipWait { get; set; }
}

/// <summary>
/// Result of the complex job processing
/// </summary>
public sealed class ComplexJobResult
{
    /// <summary>
    /// Dictionary mapping each todo item to when it was processed (null if not yet processed)
    /// </summary>
    public Dictionary<string, DateTime?> TodoResult { get; set; } = [];
}
