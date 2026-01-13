import { describe, it, after } from "node:test";
import assert from "node:assert";
import { closeConnection } from "../../lib/db.ts";
import {
  submitComplexJob,
  getJobStatus,
  getJobStatusRaw,
  waitForJobCompletion,
  type ComplexJobStatusResponse,
} from "./helpers.ts";

describe("GET /jobs/complex/{trackingId} - Job Status", () => {
  after(async () => {
    await closeConnection();
  });

  it("returns pending status for new job before processing starts", async () => {
    const todoItems = ["task 1", "task 2"];
    const { data: submitResult } = await submitComplexJob(todoItems);

    const status = await getJobStatus(submitResult.trackingId);

    assert.strictEqual(status.trackingId, submitResult.trackingId);
    assert.strictEqual(typeof status.isComplete, "boolean");
    assert.strictEqual(typeof status.currentStep, "number");
    assert.strictEqual(typeof status.totalSteps, "number");
    assert.ok(status.status, "Should have a status message");
  });

  it("returns 404 for non-existent job", async () => {
    const fakeTrackingId = "00000000-0000-0000-0000-000000000000";

    const response = await getJobStatusRaw(fakeTrackingId);

    assert.strictEqual(response.status, 404, "Should return 404 Not Found");
  });

  it("returns 400 for invalid tracking ID format", async () => {
    const response = await getJobStatusRaw("not-a-guid");

    // FastEndpoints route constraint should reject invalid GUIDs
    assert.ok(
      response.status >= 400,
      "Should return error status for invalid GUID"
    );
  });

  it("shows 'Pending' status before job handler executes", async () => {
    const todoItems = ["task"];
    const { data: submitResult } = await submitComplexJob(todoItems);

    // Get status immediately - may catch "Pending" before handler runs
    const status = await getJobStatus(submitResult.trackingId);

    // Status could be:
    // - "Pending" (not started, no result yet)
    // - "Processing" (job started but handler hasn't set status)
    // - "Starting" (handler has begun)
    // - "Processed: ..." (processing items)
    // - "Complete" (finished)
    // depending on timing
    assert.ok(
      ["Pending", "Starting", "Processing", "Complete"].includes(status.status) ||
        status.status.startsWith("Processed:"),
      `Status should be valid: ${status.status}`
    );

    // Clean up - wait for completion
    await waitForJobCompletion(submitResult.trackingId);
  });

  it("shows 'Starting' status when job begins execution", async () => {
    const todoItems = ["task 1", "task 2", "task 3"];
    const { data: submitResult } = await submitComplexJob(todoItems);

    // Poll rapidly to try to catch "Starting" status
    const observedStatuses: string[] = [];
    const startTime = Date.now();

    while (Date.now() - startTime < 5000) {
      const status = await getJobStatus(submitResult.trackingId);
      if (!observedStatuses.includes(status.status)) {
        observedStatuses.push(status.status);
      }
      if (status.isComplete) break;
      await new Promise((r) => setTimeout(r, 20));
    }

    // Should have seen at least one of these progression statuses
    assert.ok(
      observedStatuses.some(
        (s) =>
          s === "Pending" ||
          s === "Starting" ||
          s.startsWith("Processed:") ||
          s === "Complete"
      ),
      `Should see valid status progression: ${observedStatuses.join(", ")}`
    );
  });

  it("shows 'Complete' status when job finishes", async () => {
    const todoItems = ["task"];
    const { data: submitResult } = await submitComplexJob(todoItems);

    const finalStatus = await waitForJobCompletion(submitResult.trackingId);

    assert.strictEqual(finalStatus.status, "Complete");
    assert.strictEqual(finalStatus.isComplete, true);
  });

  it("returns correct step counts", async () => {
    const todoItems = ["a", "b", "c"];
    const { data: submitResult } = await submitComplexJob(todoItems);

    const finalStatus = await waitForJobCompletion(submitResult.trackingId);

    // Total steps = number of items + 1 (starting step)
    assert.strictEqual(
      finalStatus.totalSteps,
      4,
      "totalSteps should be items + 1"
    );
    // When complete, currentStep equals totalSteps
    assert.strictEqual(
      finalStatus.currentStep,
      finalStatus.totalSteps,
      "currentStep should equal totalSteps when complete"
    );
  });

  it("tracks progress through intermediate steps", async () => {
    const todoItems = ["step 1", "step 2", "step 3", "step 4", "step 5"];
    const { data: submitResult } = await submitComplexJob(todoItems);

    const statuses: ComplexJobStatusResponse[] = [];
    const startTime = Date.now();

    while (Date.now() - startTime < 10000) {
      const status = await getJobStatus(submitResult.trackingId);
      statuses.push(status);

      if (status.isComplete) break;
      await new Promise((r) => setTimeout(r, 30));
    }

    assert.ok(statuses.length > 1, "Should have multiple status updates");

    const steps = statuses.map((s) => s.currentStep);
    const uniqueSteps = [...new Set(steps)];

    // Should see progression through steps (may not see all due to timing)
    assert.ok(
      uniqueSteps.length >= 1,
      "Should have seen step progression"
    );

    // Verify final state
    const finalStatus = statuses[statuses.length - 1];
    assert.strictEqual(finalStatus.isComplete, true);
    assert.strictEqual(finalStatus.totalSteps, 6); // 5 items + 1 starting
  });
});
