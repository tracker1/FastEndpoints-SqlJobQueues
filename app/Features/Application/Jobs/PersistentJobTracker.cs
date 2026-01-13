using FastEndpoints;

namespace Application.Jobs;

/// <summary>
/// A custom implementation of IJobTracker that persists job results to SQL Server
/// via the IJobStorageProvider, rather than using the default in-memory storage.
/// </summary>
/// <typeparam name="TCommand">The command type being tracked</typeparam>
public sealed class PersistentJobTracker<TCommand>(
  IJobStorageProvider<JobRecord> jobStorageProvider,
  IJobResultProvider jobResultProvider
) : IJobTracker<TCommand>
  where TCommand : ICommandBase
{
  private readonly IJobStorageProvider<JobRecord> _jobStorageProvider = jobStorageProvider;
  private readonly IJobResultProvider _jobResultProvider = jobResultProvider;

  /// <summary>
  /// Cancels a job by its tracking ID using the storage provider to persist
  /// the cancellation to the database.
  /// </summary>
  public Task CancelJobAsync(Guid trackingId, CancellationToken ct = default)
  {
    return _jobStorageProvider.CancelJobAsync(trackingId, ct);
  }

  /// <summary>
  /// Stores a job result to the database via the IJobResultProvider.
  /// This persists the result to WorkResultJson in the JobQueue/JobHistory tables.
  /// </summary>
  public async Task StoreJobResultAsync<TResult>(Guid trackingId, TResult result, CancellationToken ct = default)
    where TResult : IJobResult
  {
    await _jobResultProvider.StoreJobResultAsync(trackingId, result, ct);
  }

  /// <summary>
  /// Retrieves a job result from the database via the IJobResultProvider.
  /// Returns null if the job hasn't started or no result has been stored yet.
  /// </summary>
  public Task<TResult?> GetJobResultAsync<TResult>(Guid trackingId, CancellationToken ct = default)
  {
    return _jobResultProvider.GetJobResultAsync<TResult>(trackingId, ct);
  }
}
