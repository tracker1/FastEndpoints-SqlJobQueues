using System.Reflection.Metadata;
using System.Text.Json.Nodes;
using Application.Extensions;
using Dapper;
using FastEndpoints;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.Data;
using Microsoft.Data.SqlClient;
using Microsoft.IdentityModel.Tokens;

namespace Application.Jobs;

public sealed class JobStorageProvider(Func<SqlConnection> dbFactory, ILogger<JobStorageProvider> logger) : IJobStorageProvider<JobRecord>, IJobResultProvider
{
  public static readonly string UpsertJobQueue = @"
    BEGIN TRANSACTION;
      UPDATE [MyApp].[JobQueue] SET
        [WorkCommandJson] = @WorkCommandJson, 
        [WorkResultJson] = @WorkResultJson, 
        [WorkLogJsonLines] = @WorkLogJsonLines, 
        [Tries] = @Tries,
        [ExecuteAfter] = @ExecuteAfter, 
        [ExpireOn] = @ExpireOn, 
        [IsComplete] = @IsComplete, 
        [IsCancelled] = @IsCancelled, 
        [StartedOn] = @StartedOn, 
        [FinishedOn] = @FinishedOn
      WHERE [TrackingID] = @TrackingID;

      IF (@@ROWCOUNT = 0)
      BEGIN
        INSERT INTO [MyApp].[JobQueue]
        (
          [QueueID], [TrackingID], [WorkCommandJson], [WorkResultJson], [WorkLogJsonLines], [Tries], [ExecuteAfter], [ExpireOn], [IsComplete], [IsCancelled], [StartedOn], [FinishedOn], [CreatedOn], [CreatedByUserId], [CreatedByDisplayName]
        )
        VALUES
        (
          @QueueID, @TrackingID, @WorkCommandJson, @WorkResultJson, @WorkLogJsonLines, @Tries, @ExecuteAfter, @ExpireOn, @IsComplete, @IsCancelled, @StartedOn, @FinishedOn, @CreatedOn, @CreatedByUserId, @CreatedByDisplayName
        ) 
      END;
    COMMIT TRANSACTION;
  ";

  public static readonly string UpsertJobQueueHistory = @"
    BEGIN TRANSACTION;
      DELETE FROM [MyApp].[JobQueue]
      WHERE [TrackingID] = @TrackingID;

      UPDATE [MyApp].[JobHistory] SET
        [WorkCommandJson] = @WorkCommandJson, 
        [WorkResultJson] = @WorkResultJson, 
        [WorkLogJsonLines] = @WorkLogJsonLines, 
        [Tries] = @Tries,
        [ExecuteAfter] = @ExecuteAfter, 
        [ExpireOn] = @ExpireOn, 
        [IsComplete] = @IsComplete, 
        [IsCancelled] = @IsCancelled, 
        [StartedOn] = @StartedOn, 
        [FinishedOn] = @FinishedOn
      WHERE [TrackingID] = @TrackingID;

      IF (@@ROWCOUNT = 0)
      BEGIN
        INSERT INTO [MyApp].[JobHistory]
        (
          [QueueID], [TrackingID], [WorkCommandJson], [WorkResultJson], [WorkLogJsonLines], [Tries], [ExecuteAfter], [ExpireOn], [IsComplete], [IsCancelled], [StartedOn], [FinishedOn], [CreatedOn], [CreatedByUserId], [CreatedByDisplayName]
        )
        VALUES
        (
          @QueueID, @TrackingID, @WorkCommandJson, @WorkResultJson, @WorkLogJsonLines, @Tries, @ExecuteAfter, @ExpireOn, @IsComplete, @IsCancelled, @StartedOn, @FinishedOn, @CreatedOn, @CreatedByUserId, @CreatedByDisplayName
        ) 
      END
    COMMIT TRANSACTION;
  ";


  private Func<SqlConnection> dbFactory = dbFactory;
  private ILogger<JobStorageProvider> logger = logger;

  public async Task<JobRecord?> GetJobRecordAsync(Guid trackingId, CancellationToken ct)
  {
    await using var db = dbFactory();
    await db.OpenAsync(ct);
    return await db.QuerySingleOrDefaultAsync<JobRecord>(
      @"
        SELECT *
          FROM [MyApp].[JobQueue]
          WHERE [TrackingID] = @trackingId
        UNION ALL
        SELECT *
          FROM [MyApp].[JobHistory]
          WHERE [TrackingID] = @trackingId
      ",
      new { trackingId }
    );
  }

  public async Task StoreJobAsync(JobRecord job, CancellationToken ct)
  {
    if (ct.IsCancellationRequested) return;
    try
    {
      // logger.LogInformation($"Saving Item: {JsonHelper.ToJson(job)}");

      if (job.WorkResultJson is null) job.WorkResultJson = "{}";

      await using var db = dbFactory();
      await db.OpenAsync(ct);
      await db.ExecuteAsync(
        job.IsComplete || job.IsCancelled ? UpsertJobQueueHistory : UpsertJobQueue,
        job
      );
    }
    catch (Exception ex)
    {
      logger.LogError(ex, "Error storing job with TrackingID {TrackingID}", job.TrackingID);
      throw;
    }
  }

  public async Task<IEnumerable<JobRecord>> GetNextBatchAsync(PendingJobSearchParams<JobRecord> p)
  {
    await using var db = dbFactory();
    await db.OpenAsync();
    var records = (await db.QueryAsync<JobRecord>(
      $@"
        SELECT TOP {p.Limit}
          *
        FROM [MyApp].[JobQueue]
        WHERE [StartedOn] IS NULL
        AND [ExecuteAfter] <= @now
        ORDER BY [CreatedOn] ASC
      ",
      new
      {
        now = DateTime.UtcNow
      }
    )).ToList();

    foreach (var record in records)
    {
      record.StartedOn = DateTime.UtcNow;
      await this.StoreJobAsync(record, CancellationToken.None);
    }

    return records;
  }

  public async Task MarkJobAsCompleteAsync(JobRecord job, CancellationToken ct)
  {
    logger.LogDebug("Marking job with TrackingID {TrackingID} as complete.", job.TrackingID);
    job.IsComplete = true;
    job.IsCancelled = false;
    job.FinishedOn = DateTime.UtcNow;
    await this.StoreJobAsync(job, ct);
  }

  public async Task CancelJobAsync(Guid trackingId, CancellationToken ct)
  {
    await using var db = dbFactory();
    await db.OpenAsync(ct);
    var job = await db.QuerySingleOrDefaultAsync<JobRecord>(
      @"
        SELECT *
        FROM [MyApp].[JobQueue]
        WHERE [TrackingID] = @trackingId
      ",
      new { trackingId }
    );

    if (job is null) return;

    job.IsCancelled = true;
    job.FinishedOn = DateTime.UtcNow;
    await this.StoreJobAsync(job, ct);
  }

  public async Task OnHandlerExecutionFailureAsync(JobRecord job, Exception exception, CancellationToken ct)
  {
    logger.LogError(exception, "Rescheduling job with TrackingID {TrackingID} due to execution failure.", job.TrackingID);

    job.WorkLogJsonLines += JsonHelper.ToJson(new
    {
      dtm = DateTime.UtcNow,
      lvl = "Error",
      msg = $"Job execution failed with exception: {exception.Message}",
    }) + "\n";

    job.ExecuteAfter = DateTime.UtcNow.AddMinutes(1);
    job.StartedOn = null;
    job.FinishedOn = null;
    job.IsCancelled = false;
    job.IsComplete = false;
    job.Tries += 1;
    await this.StoreJobAsync(job, ct);
  }
  public async Task PurgeStaleJobsAsync(StaleJobSearchParams<JobRecord> p)
  {
    var now = DateTime.UtcNow;
    var msg = JsonHelper.ToJson(new
    {
      dtm = now,
      lvl = "Information",
      msg = "Job automatically cancelled due to staleness."
    }) + "\n";

    await using var db = dbFactory();
    await db.OpenAsync();
    await db.ExecuteAsync(
      $@"
        BEGIN TRANSACTION;
          -- update in place
          UPDATE [MyApp].[JobQueue]
          SET [IsCancelled] = 1,
              [FinishedOn] = @now,
              [WorkLogJsonLines] = CONCAT([WorkLogJsonLines],@msg)
          WHERE [IsComplete] = 0
          AND [StartedOn] IS NULL
          AND [ExpireOn] <= @now;

          -- move to history
          INSERT INTO [MyApp].[JobHistory]
          (
            [QueueID], [TrackingID], [WorkCommandJson], [WorkResultJson], [WorkLogJsonLines], [Tries], [ExecuteAfter], [ExpireOn], [IsComplete], [IsCancelled], [StartedOn], [FinishedOn], [CreatedOn], [CreatedByUserId], [CreatedByDisplayName]
          )
          SELECT
            [QueueID], [TrackingID], [WorkCommandJson], [WorkResultJson], [WorkLogJsonLines], [Tries], [ExecuteAfter], [ExpireOn], [IsComplete], [IsCancelled], [StartedOn], [FinishedOn], [CreatedOn], [CreatedByUserId], [CreatedByDisplayName]
          FROM [MyApp].[JobQueue]
          WHERE [FinishedON] IS NOT NULL;

          -- delete from queue
          DELETE FROM [MyApp].[JobQueue]
          WHERE [FinishedON] IS NOT NULL;
        COMMIT TRANSACTION;
      ",
      new { msg, now }
    );
  }

  public async Task StoreJobResultAsync<TResult>(Guid trackingId, TResult result, CancellationToken ct)
  {
    var job = await GetJobRecordAsync(trackingId, ct);
    if (job is null)
    {
      logger.LogWarning("Attempted to store result for non-existent job {TrackingId}", trackingId);
      return;
    }
    job.SetResult(result);
    await StoreJobAsync(job, ct);
  }

  public async Task<TResult?> GetJobResultAsync<TResult>(Guid trackingId, CancellationToken ct)
  {
    var job = await GetJobRecordAsync(trackingId, ct);
    if (job is null) return default;
    return job.GetResult<TResult>();
  }
}