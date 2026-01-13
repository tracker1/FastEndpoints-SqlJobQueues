import assert from "node:assert";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";

// =============================================================================
// Types matching API responses
// =============================================================================

export interface ComplexJobSubmitResponse {
  trackingId: string;
  message: string;
}

export interface ComplexJobResult {
  todoResult: Record<string, string | null>;
}

export interface ComplexJobStatusResponse {
  trackingId: string;
  isComplete: boolean;
  currentStep: number;
  totalSteps: number;
  status: string;
  result: ComplexJobResult | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Submit a complex job for processing
 */
export async function submitComplexJob(
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
 * Get the current status of a complex job
 */
export async function getJobStatus(
  trackingId: string
): Promise<ComplexJobStatusResponse> {
  const response = await fetch(`${BASE_URL}/jobs/complex/${trackingId}`);
  assert.strictEqual(response.status, 200, "Expected 200 OK status");
  return (await response.json()) as ComplexJobStatusResponse;
}

/**
 * Poll for job completion with timeout
 */
export async function waitForJobCompletion(
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

/**
 * Submit a raw request without assertions (for error testing)
 */
export async function submitComplexJobRaw(
  body: unknown
): Promise<Response> {
  return fetch(`${BASE_URL}/jobs/complex`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Get job status raw without assertions (for error testing)
 */
export async function getJobStatusRaw(trackingId: string): Promise<Response> {
  return fetch(`${BASE_URL}/jobs/complex/${trackingId}`);
}

export function getBaseUrl(): string {
  return BASE_URL;
}
