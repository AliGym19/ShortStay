import "server-only";
import { audit } from "@/lib/audit";
import { openrouterKey } from "@/lib/env";
import type {
  LlmRequest,
  LlmResponse,
  LlmStreamResult,
  Router,
  Schema,
} from "@/lib/llm-types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELS_URL = "https://openrouter.ai/api/v1/models";

// modelTarget strings not in the map pass through as-is (assumed to be a
// literal OpenRouter model id). verifyTierModels() checks these ids against
// OpenRouter's live catalogue before first use; if one 404s, don't guess a
// substitute — surface the real anthropic/* list.
export const TIERS: Record<string, string> = {
  "tier:everyday": "anthropic/claude-haiku-4.5",
  "tier:judgment": "anthropic/claude-opus-4.8",
};

export function resolveModel(modelTarget: string): string {
  return TIERS[modelTarget] ?? modelTarget;
}

interface OpenRouterChatResponse {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

class RetryableProviderError extends Error {}

async function rawChatCall(
  model: string,
  request: LlmRequest
): Promise<OpenRouterChatResponse> {
  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        ...(request.maxTokens !== undefined ? { max_tokens: request.maxTokens } : {}),
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        ...request.providerOptions,
      }),
      cache: "no-store",
    });
  } catch (err) {
    throw new RetryableProviderError(
      `OpenRouter network error: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  if (res.status === 429 || res.status >= 500) {
    const detail = await res.text().catch(() => "");
    throw new RetryableProviderError(
      `OpenRouter ${res.status}: ${detail.slice(0, 300)}`
    );
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.json();
}

// One retry on 429/5xx/network with 500ms backoff — a flaky provider
// mid-demo is blocker B6; a second consecutive failure surfaces normally.
async function chatWithRetry(
  model: string,
  request: LlmRequest
): Promise<OpenRouterChatResponse> {
  try {
    return await rawChatCall(model, request);
  } catch (err) {
    if (!(err instanceof RetryableProviderError)) throw err;
    await new Promise((r) => setTimeout(r, 500));
    return rawChatCall(model, request);
  }
}

function mapFinishReason(reason: string | undefined): LlmResponse["finishReason"] {
  if (reason === "stop") return "stop";
  if (reason === "length") return "length";
  if (reason === "content_filter") return "content-filter";
  return "other";
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

class OpenRouterRouter implements Router {
  async complete(request: LlmRequest): Promise<LlmResponse> {
    const resolvedModel = resolveModel(request.modelTarget);
    const data = await chatWithRetry(resolvedModel, request);
    const response: LlmResponse = {
      text: data.choices?.[0]?.message?.content ?? "",
      modelTarget: request.modelTarget,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      finishReason: mapFinishReason(data.choices?.[0]?.finish_reason),
      raw: data,
    };
    await audit.append({
      eventType: "llm.completed",
      actor: "agent:router",
      subjectType: "llm.call",
      subjectId: crypto.randomUUID(),
      payload: {
        modelTarget: request.modelTarget,
        resolvedModel,
        usage: response.usage,
      },
      parentEventId: null,
    });
    return response;
  }

  async completeStructured<T>(
    request: LlmRequest,
    schema: Schema<T>
  ): Promise<{ readonly value: T; readonly response: LlmResponse }> {
    const response = await this.complete(request);
    const value = schema.parse(JSON.parse(stripJsonFences(response.text)));
    return { value, response };
  }

  completeStream(): LlmStreamResult {
    throw new Error("completeStream is not implemented (skipped for MVP)");
  }
}

export const router: Router = new OpenRouterRouter();

// Verifies the tier map's model ids against OpenRouter's live catalogue.
// On a miss the caller gets the nearest Anthropic ids to pick from — we do
// NOT silently substitute.
export async function verifyTierModels(): Promise<{
  ok: boolean;
  missing: string[];
  anthropicModels: string[];
}> {
  const res = await fetch(MODELS_URL, {
    headers: { Authorization: `Bearer ${openrouterKey()}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`OpenRouter /models returned ${res.status}`);
  }
  const data = (await res.json()) as { data?: { id?: string }[] };
  const ids = new Set((data.data ?? []).map((m) => m.id).filter(Boolean) as string[]);
  const missing = Object.values(TIERS).filter((id) => !ids.has(id));
  const anthropicModels = [...ids].filter((id) => id.startsWith("anthropic/")).sort();
  return { ok: missing.length === 0, missing, anthropicModels };
}
