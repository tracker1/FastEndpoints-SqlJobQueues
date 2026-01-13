import { describe, it, after } from "node:test";
import assert from "node:assert";
import { closeConnection } from "../../lib/db.ts";
import {
  getJobStatus,
  submitComplexJob,
  waitForJobCompletion,
} from "./helpers.ts";

describe("POST /jobs/complex - Job Processing", () => {
  after(async () => {
    await closeConnection();
  });

  it("completes job with all items processed", async () => {
    const todoItems = ["item A", "item B", "item C"];
    const { data: submitResult } = await submitComplexJob(todoItems, true);

    const finalStatus = await waitForJobCompletion(submitResult.trackingId);

    assert.strictEqual(finalStatus.isComplete, true, "Job should be complete");
    assert.strictEqual(
      finalStatus.status,
      "Complete",
      "Status should be 'Complete'"
    );
    assert.strictEqual(
      finalStatus.totalSteps,
      todoItems.length + 1,
      "Total steps should be items + 1 (starting step)"
    );
    assert.strictEqual(
      finalStatus.currentStep,
      finalStatus.totalSteps,
      "Current step should equal total steps when complete"
    );
  });

  it("returns result with all items having timestamps", async () => {
    const todoItems = ["item A", "item B", "item C"];
    const { data: submitResult } = await submitComplexJob(todoItems, true);

    const finalStatus = await waitForJobCompletion(submitResult.trackingId);

    assert.ok(finalStatus.result, "Result should exist when complete");
    assert.ok(
      finalStatus.result.todoResult,
      "TodoResult should exist in result"
    );

    for (const item of todoItems) {
      assert.ok(
        finalStatus.result.todoResult[item],
        `Item '${item}' should have a timestamp`
      );
    }
  });

  it("processes single item correctly", async () => {
    const todoItems = ["only one"];
    const { data: submitResult } = await submitComplexJob(todoItems, true);

    const finalStatus = await waitForJobCompletion(submitResult.trackingId);

    assert.strictEqual(finalStatus.isComplete, true);
    assert.strictEqual(finalStatus.totalSteps, 2); // 1 item + 1 starting step
    assert.strictEqual(finalStatus.currentStep, 2);
    assert.ok(finalStatus.result?.todoResult["only one"]);
  });

  it("processes many items correctly", async () => {
    const todoItems = Array.from({ length: 20 }, (_, i) => `item ${i + 1}`);
    const { data: submitResult } = await submitComplexJob(todoItems, true);

    const finalStatus = await waitForJobCompletion(submitResult.trackingId, 30000);

    assert.strictEqual(finalStatus.isComplete, true);
    assert.strictEqual(finalStatus.totalSteps, 21); // 20 items + 1 starting step
    assert.strictEqual(finalStatus.currentStep, 21);
    assert.strictEqual(Object.keys(finalStatus.result!.todoResult).length, 20);

    // Verify all items are present
    for (const item of todoItems) {
      assert.ok(
        finalStatus.result?.todoResult[item],
        `Item '${item}' should be in result`
      );
    }
  });

  it("preserves special characters in todo items", async () => {
    const todoItems = [
      "Special: @#$%^&*()",
      "Unicode: \u4f60\u597d\u4e16\u754c",
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

  it("shows processing status messages and step changes during execution", async () => {
    const todoItems = ["first", "second", "third"];
    const { data: submitResult } = await submitComplexJob(todoItems, false);

    const observedStatuses: string[] = [];
    const observedSteps: number[] = [];
    const startTime = Date.now();
    let status = await getJobStatus(submitResult.trackingId);

    while (Date.now() - startTime < 30000) {
      if (!observedStatuses.includes(status.status)) {
        observedStatuses.push(status.status);
      }
      if (!observedSteps.includes(status.currentStep)) {
        observedSteps.push(status.currentStep);
      }

      if (status.isComplete) break;

      await new Promise((r) => setTimeout(r, 250));
      status = await getJobStatus(submitResult.trackingId);
    }

    // With skipWait=false, we should observe status changes over time
    // Only verify that status changed at least once (progression occurred)
    assert.ok(
      observedStatuses.length > 1,
      `Should have observed multiple status values: ${observedStatuses.join(", ")}`
    );

    // Should observe currentStep changing during execution
    assert.ok(
      observedSteps.length > 1,
      `Should have observed multiple step changes: ${observedSteps.join(", ")}`
    );
  });

  it("timestamps are in valid ISO format", async () => {
    const todoItems = ["test item"];
    const { data: submitResult } = await submitComplexJob(todoItems, true);

    const finalStatus = await waitForJobCompletion(submitResult.trackingId);

    assert.ok(finalStatus.result?.todoResult["test item"]);

    const timestamp = finalStatus.result!.todoResult["test item"]!;
    const parsed = new Date(timestamp);

    assert.ok(
      !isNaN(parsed.getTime()),
      `Timestamp should be valid date: ${timestamp}`
    );
  });
});
