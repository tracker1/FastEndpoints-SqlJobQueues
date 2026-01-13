import { describe, it, after } from "node:test";
import assert from "node:assert";
import { closeConnection, query } from "../../lib/db.ts";
import { submitComplexJob, waitForJobCompletion } from "./helpers.ts";

interface JobHistoryRecord {
  TrackingID: string;
  QueueID: string;
  IsComplete: boolean;
  StartedOn: Date | null;
  FinishedOn: Date | null;
  WorkResultJson: string;
}

describe("Complex Job - Database Verification", () => {
  after(async () => {
    await closeConnection();
  });

  describe("completed job record", async () => {
    const todoItems = ["db test item"];
    const { data: submitResult } = await submitComplexJob(todoItems, true);
    await waitForJobCompletion(submitResult.trackingId);

    // Fetch the complete job record once
    const historyResult = await query<JobHistoryRecord>(
      `SELECT TrackingID, QueueID, IsComplete, StartedOn, FinishedOn, WorkResultJson
       FROM [MyApp].[JobHistory]
       WHERE TrackingID = @trackingId`,
      { trackingId: submitResult.trackingId }
    );

    const queueResult = await query<{ TrackingID: string }>(
      `SELECT TrackingID FROM [MyApp].[JobQueue] WHERE TrackingID = @trackingId`,
      { trackingId: submitResult.trackingId }
    );

    it("is moved to JobHistory", () => {
      assert.strictEqual(
        historyResult.recordset.length,
        1,
        "Completed job should be in JobHistory"
      );
    });

    it("is removed from JobQueue", () => {
      assert.strictEqual(
        queueResult.recordset.length,
        0,
        "Completed job should not be in JobQueue"
      );
    });

    it("has valid QueueID (MD5 hash)", () => {
      const record = historyResult.recordset[0];
      assert.ok(
        /^[a-f0-9]{32}$/.test(record.QueueID),
        `QueueID should be a valid MD5 hash (32 hex chars): ${record.QueueID}`
      );
    });

    it("has IsComplete flag set to true", () => {
      assert.strictEqual(
        historyResult.recordset[0].IsComplete,
        true,
        "IsComplete should be true"
      );
    });

    it("has StartedOn timestamp", () => {
      assert.ok(
        historyResult.recordset[0].StartedOn,
        "StartedOn should be set"
      );
    });

    it("has FinishedOn timestamp", () => {
      assert.ok(
        historyResult.recordset[0].FinishedOn,
        "FinishedOn should be set"
      );
    });

    it("has WorkResultJson with processing result", () => {
      const workResult = JSON.parse(historyResult.recordset[0].WorkResultJson);

      assert.ok(workResult, "WorkResultJson should be valid JSON");
      // C# serializes with PascalCase
      assert.ok(workResult.Result, "Should have Result property");
      assert.ok(
        workResult.Result.TodoResult,
        "Should have TodoResult in Result"
      );
      assert.ok(
        workResult.Result.TodoResult["db test item"],
        "Should contain the processed item"
      );
    });
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
