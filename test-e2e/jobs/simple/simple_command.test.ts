import { describe, it } from "node:test";
import assert from "node:assert";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";

describe("POST /jobs/simple", () => {
  it("echoes message back", async () => {
    const testMessage = "Hello, World!";

    const response = await fetch(`${BASE_URL}/jobs/simple`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: testMessage }),
    });

    assert.strictEqual(response.status, 200);

    const result = (await response.json()) as { echo: string };
    assert.ok(result.echo !== undefined, "Response should have echo property");
    assert.strictEqual(result.echo, testMessage);
  });

  it("handles empty message", async () => {
    const response = await fetch(`${BASE_URL}/jobs/simple`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "" }),
    });

    assert.strictEqual(response.status, 200);

    const result = (await response.json()) as { echo: string };
    assert.ok(result.echo !== undefined, "Response should have echo property");
    assert.strictEqual(result.echo, "");
  });

  it("handles special characters", async () => {
    const testMessage = "Special chars: @#$%^&*()_+-=[]{}|;':\",./<>?";

    const response = await fetch(`${BASE_URL}/jobs/simple`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: testMessage }),
    });

    assert.strictEqual(response.status, 200);

    const result = (await response.json()) as { echo: string };
    assert.strictEqual(result.echo, testMessage);
  });

  it("handles unicode characters", async () => {
    const testMessage = "Unicode: 你好世界 🌍 émojis";

    const response = await fetch(`${BASE_URL}/jobs/simple`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: testMessage }),
    });

    assert.strictEqual(response.status, 200);

    const result = (await response.json()) as { echo: string };
    assert.strictEqual(result.echo, testMessage);
  });
});
