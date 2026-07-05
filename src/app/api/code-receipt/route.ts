import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { parseCodedReceipt, type CodedReceipt } from "@/lib/coded-receipt";
import { db } from "@/lib/db";
import { router } from "@/lib/llm";
import { promptRegistry } from "@/lib/prompt-registry";
import { codeReceiptFallback } from "@/lib/receipt-fallback";
import { properties } from "@/lib/schema";

// Receipt → coded fields. LLM first (active receipt-coder prompt, property
// list interpolated at call time), deterministic fallback on ANY failure —
// the flow must succeed with the network cable pulled (acceptance test 2).

const LLM_TIMEOUT_MS = 15_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`LLM timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function POST(request: Request) {
  let receiptText: string;
  try {
    const json = (await request.json()) as { receiptText?: unknown };
    if (typeof json.receiptText !== "string" || !json.receiptText.trim()) {
      return NextResponse.json(
        { error: "receiptText (non-empty string) is required" },
        { status: 400 }
      );
    }
    receiptText = json.receiptText;
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }

  const receiptId = crypto.randomUUID().slice(0, 8);
  const captured = await audit.append({
    eventType: "receipt.captured",
    actor: "user:demo",
    subjectType: "receipt",
    subjectId: receiptId,
    parentEventId: null,
    payload: { chars: receiptText.length, preview: receiptText.slice(0, 120) },
  });

  const props = await db.select().from(properties);

  let coded: CodedReceipt;
  let via: "llm" | "fallback" = "llm";
  let promptVersion: number | null = null;

  try {
    const [prompt] = await promptRegistry.list({
      name: "receipt-coder",
      status: "active",
      limit: 1,
    });
    if (!prompt) throw new Error("no active receipt-coder prompt");
    promptVersion = prompt.version;

    const propertyList = props
      .map((p) => `${p.id} ${p.name}${p.area ? ` (${p.area})` : ""}`)
      .join(", ");
    const body = prompt.body.replace("{{PROPERTY_LIST}}", propertyList);

    const { value } = await withTimeout(
      router.completeStructured(
        {
          modelTarget: prompt.modelTarget,
          messages: [
            { role: "system", content: body },
            { role: "user", content: `--- RECEIPT ---\n${receiptText}` },
          ],
          maxTokens: 1000,
          temperature: 0,
        },
        { parse: parseCodedReceipt }
      ),
      LLM_TIMEOUT_MS
    );
    coded = value;
  } catch {
    coded = codeReceiptFallback(receiptText, props);
    via = "fallback";
  }

  const codedEvent = await audit.append({
    eventType: "receipt.coded",
    actor: via === "llm" ? `agent:receipt-coder@v${promptVersion}` : "system:receipt-fallback",
    subjectType: "receipt",
    subjectId: receiptId,
    parentEventId: captured.id,
    payload: { ...coded, via, promptVersion },
  });

  return NextResponse.json({
    ...coded,
    via,
    receiptId,
    codedEventId: codedEvent.id,
  });
}
