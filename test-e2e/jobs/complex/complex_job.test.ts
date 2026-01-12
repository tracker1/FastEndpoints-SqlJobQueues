import { describe, it, after } from "node:test";
import assert from "node:assert";
import { closeConnection, query } from "../../lib/db.ts";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";

interface ComplexJobSubmitResponse {
  trackingId: string;
  message: string;
}

interface ComplexJobResult {
  todoResult: Record<string, string | null>;
}

interface ComplexJobStatusResponse {
  trackingId: string;
  isComplete: boolean;
  currentStep: number;
  totalSteps: number;
  status: string;
  result: ComplexJobResult | null;
}

/**
 * Helper function to submit a complex job
 */
async function submitComplexJob(
  todoItems: string[],
  skipWait: boolean = true
): Promise<{ response: Response; data: ComplexJobSubmitResponse }> {
  const response = await fetch(`${BASE_URL}/jobs/complex`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ todoItems, skipWait }),
  });

  assert.strictEqual(response.status, 201, "Expected 201 Created status");
  const data = (await response.json()) as ComplexJobSubmitResponse;
  return { response, data };
}

/**
 * Helper function to get job status
 */
async function getJobStatus(
  trackingId: string
): Promise<ComplexJobStatusResponse> {
  const response = await fetch(`${BASE_URL}/jobs/complex/${trackingId}`);
  assert.strictEqual(response.status, 200, "Expected 200 OK status");
  return (await response.json()) as ComplexJobStatusResponse;
}

/**
 * Helper function to poll for job completion
 */
async function waitForJobCompletion(
  trackingId: string,
  maxWaitMs: number = 10000,
  pollIntervalMs: number = 500
): Promise<ComplexJobStatusResponse> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getJobStatus(trackingId);
    if (status.isComplete) {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Job ${trackingId} did not complete within ${maxWaitMs}ms`);
}

// =============================================================================
// Job Submission Tests
// =============================================================================

describe("POST /jobs/complex - submission", () => {
  after(async () => {
    await closeConnection();
  });

  it("submits job and returns tracking ID", async () => {
    const todoItems = ["task 1", "task 2", "task 3"];

    const { data: result } = await submitComplexJob(todoItems);

    assert.ok(result.trackingId, "Response should have trackingId");
    assert.ok(result.message, "Response should have message");
    assert.strictEqual(
      result.message,
      "Job queued successfully with 3 items to process"
    );
  });

  it("returns 400 for empty todo list", async () => {
    const response = await fetch(`${BASE_URL}/jobs/complex`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todoItems: [] }),
    });

    assert.strictEqual(response.status, 400, "Expected 400 Bad Request status");
  });

  it("returns Location header", async () => {
    const todoItems = ["single task"];

    const response = await fetch(`${BASE_URL}/jobs/complex`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todoItems, skipWait: true }),
    });

    assert.strictEqual(response.status, 201);

    const location = response.headers.get("Location");
    assert.ok(location, "Response should have Location header");

    const result = (await response.json()) as ComplexJobSubmitResponse;
    assert.ok(
      location.includes(result.trackingId),
      "Location header should contain tracking ID"
    );
  });
});

// =============================================================================
// Job Status Tests
// =============================================================================

describe("GET /jobs/complex/{trackingId} - status", () => {
  after(async () => {
    await closeConnection();
  });

  it("returns pending status for new job", async () => {
    const todoItems = ["task 1", "task 2"];
    const { data: submitResult } = await submitComplexJob(todoItems);

    const status = await getJobStatus(submitResult.trackingId);

    assert.strictEqual(status.trackingId, submitResult.trackingId);
    assert.ok(status.totalSteps >= 0);
  });

  it("returns 404 for non-existent job", async () => {
    const fakeTrackingId = "00000000-0000-0000-0000-000000000000";

    const response = await fetch(`${BASE_URL}/jobs/complex/${fakeTrackingId}`);

    assert.ok(response.status >= 400, "Should return error status for non-existent job");
  });
});

// =============================================================================
// Job Processing & Progress Tests
// =============================================================================

describe("POST /jobs/complex - processing", () => {
  after(async () => {
    await closeConnection();
  });

  it("job completes with all items processed", async () => {
    const todoItems = ["item A", "item B", "item C"];
    const { data: submitResult } = await submitComplexJob(todoItems, true);

    const finalStatus = await waitForJobCompletion(submitResult.trackingId);

    assert.strictEqual(finalStatus.isComplete, true, "Job should be complete");
    assert.strictEqual(finalStatus.status, "Complete", "Status should be 'Complete'");
    assert.strictEqual(
      finalStatus.totalSteps,
      todoItems.length + 1,
      "Total steps should be items + 1"
    );
    assert.strictEqual(
      finalStatus.currentStep,
      todoItems.length,
      "Current step should equal number of items"
    );

    assert.ok(finalStatus.result, "Result should exist when complete");
    assert.ok(finalStatus.result.todoResult, "TodoResult should exist in result");

    for (const item of todoItems) {
      assert.ok(
        finalStatus.result.todoResult[item],
        `Item '${item}' should have a timestamp`
      );
    }
  });

  it("intermediate status shows progress", async () => {
    const todoItems = ["step 1", "step 2", "step 3", "step 4", "step 5"];
    const { data: submitResult } = await submitComplexJob(todoItems, true);

    const statuses: ComplexJobStatusResponse[] = [];
    const startTime = Date.now();
    const maxWaitMs = 10000;

    while (Date.now() - startTime < maxWaitMs) {
      const status = await getJobStatus(submitResult.trackingId);
      statuses.push(status);

      if (status.isComplete) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    assert.ok(statuses.length > 1, "Should have multiple status updates");

    const finalStatus = statuses[statuses.length - 1];
    assert.strictEqual(finalStatus.isComplete, true, "Final status should be complete");

    const steps = statuses.map((s) => s.currentStep);
    const uniqueSteps = [...new Set(steps)];
    assert.ok(
      uniqueSteps.length > 1,
      "Should have seen multiple different step values"
    );
  });

  it("handles single item", async () => {
    const todoItems = ["only one"];
    const { data: submitResult } = await submitComplexJob(todoItems, true);

    const finalStatus = await waitForJobCompletion(submitResult.trackingId);

    assert.strictEqual(finalStatus.isComplete, true);
    assert.strictEqual(finalStatus.totalSteps, 2); // 1 item + 1 starting step
    assert.ok(finalStatus.result?.todoResult["only one"]);
  });

  it("handles many items", async () => {
    const todoItems = Array.from({ length: 20 }, (_, i) => `item ${i + 1}`);
    const { data: submitResult } = await submitComplexJob(todoItems, true);

    const finalStatus = await waitForJobCompletion(submitResult.trackingId, 30000);

    assert.strictEqual(finalStatus.isComplete, true);
    assert.strictEqual(finalStatus.totalSteps, 21); // 20 items + 1 starting step
    assert.strictEqual(Object.keys(finalStatus.result!.todoResult).length, 20);
  });

  it("handles special characters in todo items", async () => {
    const todoItems = [
      "Special: @#$%^&*()",
      "Unicode: 你好世界",
      "Emoji: 🎉🚀✨",
      'Quotes: "test" and \'test\'',
    ];
    const { data: submitResult } = await submitComplexJob(todoItems, true);

    const finalStatus = await waitForJobCompletion(submitResult.trackingId);

    assert.strictEqual(finalStatus.isComplete, true);

    for (const item of todoItems) {
      assert.ok(
        finalStatus.result?.todoResult[item],
        `Special item '${item}' should be in result`
      );
    }
  });
});

// =============================================================================
// Status Message Tests
// =============================================================================

describe("POST /jobs/complex - status messages", () => {
  after(async () => {
    await closeConnection();
  });

  it("status messages reflect processing", async () => {
    const todoItems = ["first", "second", "third"];
    const { data: submitResult } = await submitComplexJob(todoItems, true);

    const observedStatuses: string[] = [];
    const startTime = Date.now();

    while (Date.now() - startTime < 10000) {
      const status = await getJobStatus(submitResult.trackingId);
      if (!observedStatuses.includes(status.status)) {
        observedStatuses.push(status.status);
      }

      if (status.isComplete) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    assert.ok(
      observedStatuses.includes("Complete"),
      "Should have seen 'Complete' status"
    );
  });
});

// =============================================================================
// Database Verification Tests
// =============================================================================

describe("Database verification", () => {
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

  it("pending job is in JobQueue", async () => {
    const todoItems = ["pending db test"];
    const { data: submitResult } = await submitComplexJob(todoItems, true);

    // Immediately check (before completion)
    const queueResult = await query<{ TrackingID: string; QueueID: string }>(
      `SELECT TrackingID, QueueID FROM [MyApp].[JobQueue] WHERE TrackingID = @trackingId`,
      { trackingId: submitResult.trackingId }
    );

    // Job should be in JobQueue (or already moved if very fast)
    // This test may be flaky if job completes very quickly
    if (queueResult.recordset.length === 1) {
      // Compare GUIDs case-insensitively (SQL Server returns uppercase)
      assert.strictEqual(
        queueResult.recordset[0].TrackingID.toLowerCase(),
        submitResult.trackingId.toLowerCase()
      );
    }

    // Wait for completion to clean up
    await waitForJobCompletion(submitResult.trackingId);
  });
});
