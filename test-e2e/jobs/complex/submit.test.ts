import { describe, it, after } from "node:test";
import assert from "node:assert";
import { closeConnection } from "../../lib/db.ts";
import {
  submitComplexJob,
  submitComplexJobRaw,
  type ComplexJobSubmitResponse,
} from "./helpers.ts";

describe("POST /jobs/complex - Job Submission", () => {
  after(async () => {
    await closeConnection();
  });

  it("submits job and returns tracking ID with message", async () => {
    const todoItems = ["task 1", "task 2", "task 3"];

    const { data } = await submitComplexJob(todoItems);

    assert.ok(data.trackingId, "Response should have trackingId");
    assert.ok(data.message, "Response should have message");
    assert.strictEqual(
      data.message,
      "Job queued successfully with 3 items to process"
    );
  });

  it("returns 201 Created with Location header", async () => {
    const todoItems = ["single task"];

    const response = await submitComplexJobRaw({ todoItems, skipWait: true });

    assert.strictEqual(response.status, 201, "Expected 201 Created status");

    const location = response.headers.get("Location");
    assert.ok(location, "Response should have Location header");

    const data = (await response.json()) as ComplexJobSubmitResponse;
    assert.ok(
      location.includes(data.trackingId),
      "Location header should contain tracking ID"
    );
  });

  it("returns 400 for empty todo list", async () => {
    const response = await submitComplexJobRaw({ todoItems: [] });

    assert.strictEqual(response.status, 400, "Expected 400 Bad Request status");
  });

  it("returns 400 for missing todoItems", async () => {
    const response = await submitComplexJobRaw({});

    assert.strictEqual(response.status, 400, "Expected 400 Bad Request status");
  });

  it("handles single todo item", async () => {
    const todoItems = ["only one"];

    const { data } = await submitComplexJob(todoItems);

    assert.ok(data.trackingId, "Response should have trackingId");
    assert.strictEqual(
      data.message,
      "Job queued successfully with 1 items to process"
    );
  });

  it("handles many todo items", async () => {
    const todoItems = Array.from({ length: 20 }, (_, i) => `item ${i + 1}`);

    const { data } = await submitComplexJob(todoItems);

    assert.ok(data.trackingId, "Response should have trackingId");
    assert.strictEqual(
      data.message,
      "Job queued successfully with 20 items to process"
    );
  });

  it("handles special characters in todo items", async () => {
    const todoItems = [
      "Special: @#$%^&*()",
      "Unicode: \u4f60\u597d\u4e16\u754c",
      'Quotes: "test" and \'test\'',
    ];

    const { data } = await submitComplexJob(todoItems);

    assert.ok(data.trackingId, "Response should have trackingId");
    assert.strictEqual(
      data.message,
      "Job queued successfully with 3 items to process"
    );
  });
});
