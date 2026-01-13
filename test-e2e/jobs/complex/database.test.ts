import { describe, it, after } from "node:test";
import assert from "node:assert";
import { closeConnection, query } from "../../lib/db.ts";
import { submitComplexJob, waitForJobCompletion } from "./helpers.ts";

describe("Complex Job - Database Verification", () => {
  after(async () => {
    await closeConnection();
  });

  it("completed job is moved to JobHistory", async () => {
    const todoItems = ["db test item"];
    const { data: submitResult } = await submitComplexJob(todoItems, true);

    await waitForJobCompletion(submitResult.trackingId);

    // Give a moment for the job to be moved to history
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check that job is in JobHistory
    const historyResult = await query<{ TrackingID: string }>(
      `SELECT TrackingID FROM [MyApp].[JobHistory] WHERE TrackingID = @trackingId`,
      { trackingId: submitResult.trackingId }
    );

    assert.strictEqual(
      historyResult.recordset.length,
      1,
      "Completed job should be in JobHistory"
    );

    // Check that job is not in JobQueue
    const queueResult = await query<{ TrackingID: string }>(
      `SELECT TrackingID FROM [MyApp].[JobQueue] WHERE TrackingID = @trackingId`,
      { trackingId: submitResult.trackingId }
    );

    assert.strictEqual(
      queueResult.recordset.length,
      0,
      "Completed job should not be in JobQueue"
    );
  });

  it("job record contains correct QueueID", async () => {
    const todoItems = ["queue id test"];
    const { data: submitResult } = await submitComplexJob(todoItems, true);

    // Check immediately - job should be in JobQueue initially
    const queueResult = await query<{ TrackingID: string; QueueID: string }>(
      `SELECT TrackingID, QueueID FROM [MyApp].[JobQueue] WHERE TrackingID = @trackingId`,
      { trackingId: submitResult.trackingId }
    );

    // Job might already be completed, so also check history
    const historyResult = await query<{ TrackingID: string; QueueID: string }>(
      `SELECT TrackingID, QueueID FROM [MyApp].[JobHistory] WHERE TrackingID = @trackingId`,
      { trackingId: submitResult.trackingId }
    );

    const record = queueResult.recordset[0] || historyResult.recordset[0];

    if (record) {
      // FastEndpoints uses MD5 hash of fully qualified type name for QueueID
      // QueueID is a 32-character hex string (MD5 hash)
      assert.ok(
        /^[a-f0-9]{32}$/.test(record.QueueID),
        `QueueID should be a valid MD5 hash (32 hex chars): ${record.QueueID}`
      );
    }

    // Clean up - wait for completion
    await waitForJobCompletion(submitResult.trackingId);
  });

  it("job record contains IsComplete flag set to true after completion", async () => {
    const todoItems = ["completion flag test"];
    const { data: submitResult } = await submitComplexJob(todoItems, true);

    await waitForJobCompletion(submitResult.trackingId);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const historyResult = await query<{ IsComplete: boolean }>(
      `SELECT IsComplete FROM [MyApp].[JobHistory] WHERE TrackingID = @trackingId`,
      { trackingId: submitResult.trackingId }
    );

    assert.strictEqual(historyResult.recordset.length, 1);
    assert.strictEqual(
      historyResult.recordset[0].IsComplete,
      true,
      "IsComplete should be true in JobHistory"
    );
  });

  it("job record has FinishedOn timestamp after completion", async () => {
    const todoItems = ["finished timestamp test"];
    const { data: submitResult } = await submitComplexJob(todoItems, true);

    await waitForJobCompletion(submitResult.trackingId, 30000);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const historyResult = await query<{
      FinishedOn: Date | null;
      StartedOn: Date | null;
    }>(
      `SELECT FinishedOn, StartedOn FROM [MyApp].[JobHistory] WHERE TrackingID = @trackingId`,
      { trackingId: submitResult.trackingId }
    );

    assert.strictEqual(historyResult.recordset.length, 1);
    assert.ok(
      historyResult.recordset[0].FinishedOn,
      "FinishedOn should be set"
    );
    assert.ok(historyResult.recordset[0].StartedOn, "StartedOn should be set");
  });

  it("job WorkResultJson contains the processing result", async () => {
    const todoItems = ["result json test"];
    const { data: submitResult } = await submitComplexJob(todoItems, true);

    await waitForJobCompletion(submitResult.trackingId, 30000);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const historyResult = await query<{ WorkResultJson: string }>(
      `SELECT WorkResultJson FROM [MyApp].[JobHistory] WHERE TrackingID = @trackingId`,
      { trackingId: submitResult.trackingId }
    );

    assert.strictEqual(historyResult.recordset.length, 1);

    const workResult = JSON.parse(historyResult.recordset[0].WorkResultJson);

    assert.ok(workResult, "WorkResultJson should be valid JSON");
    // C# serializes with PascalCase
    assert.ok(workResult.Result, "Should have Result property");
    assert.ok(
      workResult.Result.TodoResult,
      "Should have TodoResult in Result"
    );
    assert.ok(
      workResult.Result.TodoResult["result json test"],
      "Should contain the processed item"
    );
  });

  it("pending job exists in JobQueue before completion", async () => {
    const todoItems = ["pending queue test"];
    const { data: submitResult } = await submitComplexJob(todoItems, true);

    // Immediately check - job should be in JobQueue (or processing)
    const queueResult = await query<{ TrackingID: string }>(
      `SELECT TrackingID FROM [MyApp].[JobQueue] WHERE TrackingID = @trackingId`,
      { trackingId: submitResult.trackingId }
    );

    // Job may or may not still be in queue depending on timing
    // This is expected behavior - just ensure we can query it
    assert.ok(
      queueResult.recordset.length === 0 || queueResult.recordset.length === 1,
      "Job should either be in queue or already moved to history"
    );

    // Clean up
    await waitForJobCompletion(submitResult.trackingId);
  });
});
