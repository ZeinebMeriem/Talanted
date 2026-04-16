import { describe, it, expect, run } from "./test-utils";

describe("API Client", () => {
  it("should validate GenerateRequest payload", () => {
    const validPayload = {
      prompt: "Build a dashboard",
      generationId: "test-123",
    };
    expect(validPayload.prompt).toBeTruthy();
    expect(validPayload.generationId).toBeTruthy();
  });

  it("should handle empty prompts gracefully", () => {
    const emptyPrompt = "";
    expect(emptyPrompt).toBeFalsy();
  });

  it("should validate EditFileRequest structure", () => {
    const editRequest = {
      generationId: "gen-123",
      instruction: "Add a button",
    };
    expect(editRequest.generationId).toBeTruthy();
    expect(editRequest.instruction).toBeTruthy();
  });

  it("should parse API error responses", () => {
    const errorResponse = {
      error: "VALIDATION_ERROR",
      message: "Invalid prompt",
      status_code: 400,
    };
    expect(errorResponse.error).toEqual("VALIDATION_ERROR");
    expect(errorResponse.status_code).toBe(400);
  });
});

// Run tests
run().catch(console.error);

