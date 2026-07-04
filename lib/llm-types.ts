/**
 * Copied verbatim from the @physical-substrate/llm-router interface spec
 * (PEA .brain/substrate/llm-router.md) — ShortStay doesn't consume the
 * substrate packages, so the types live locally. Keep in sync manually.
 *
 * Provider-agnostic LLM dispatch. Retry, fallback, model tiering and cost
 * tracking are deliberately NOT in the interface — they compose around this
 * shape at the app layer (substrate decision D007). ShortStay's tier map and
 * retry live in lib/llm.ts.
 */

export interface LlmMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

export interface LlmRequest {
  readonly modelTarget: string;
  readonly messages: readonly LlmMessage[];
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly providerOptions?: Readonly<Record<string, unknown>>;
}

export interface LlmUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

export interface LlmResponse {
  readonly text: string;
  readonly modelTarget: string;
  readonly usage: LlmUsage;
  readonly finishReason: "stop" | "length" | "content-filter" | "other";
  readonly raw?: unknown;
}

// Bring-your-own schema (zod or anything with .parse).
export interface Schema<T> {
  parse(raw: unknown): T;
}

export interface LlmStreamChunk {
  readonly text: string;
  readonly delta: string;
}

export interface LlmStreamResult {
  readonly stream: AsyncIterable<LlmStreamChunk>;
  readonly final: Promise<LlmResponse>;
}

export interface Router {
  complete(request: LlmRequest): Promise<LlmResponse>;
  completeStructured<T>(
    request: LlmRequest,
    schema: Schema<T>
  ): Promise<{ readonly value: T; readonly response: LlmResponse }>;
  completeStream(request: LlmRequest): LlmStreamResult;
}
