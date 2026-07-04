import "server-only";
import { and, desc, eq } from "drizzle-orm";
import type {
  Prompt,
  PromptCreate,
  PromptListFilter,
  PromptRegistry,
  PromptStatus,
  PromptUpdate,
} from "@/lib/prompt-registry-types";
import { db } from "@/lib/db";
import { prompts } from "@/lib/schema";
import { audit } from "@/lib/audit";

// Ported from paragon-hil apps/paragon-app/src/lib/prompt-registry.ts.
// Forced changes only: pg driver → drizzle-orm/better-sqlite3, substrate
// type import → local copy. Method behaviour — including the audit append
// on every mutation — is unchanged.

type Row = typeof prompts.$inferSelect;

function rowToPrompt(row: Row): Prompt {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    body: row.body,
    modelTarget: row.modelTarget,
    status: row.status as PromptStatus,
    createdAt: row.createdAt,
  };
}

class SqlitePromptRegistry implements PromptRegistry {
  async create(input: PromptCreate): Promise<Prompt> {
    const existing = await db
      .select({ name: prompts.name })
      .from(prompts)
      .where(eq(prompts.name, input.name))
      .limit(1);
    if (existing.length > 0) {
      throw new Error(
        `prompt "${input.name}" already exists; use update() to add a new version`,
      );
    }

    const [row] = await db
      .insert(prompts)
      .values({
        name: input.name,
        version: 1,
        body: input.body,
        modelTarget: input.modelTarget,
        status: input.status ?? "draft",
      })
      .returning();
    if (!row) throw new Error("prompt-registry.create: insert returned no row");

    await audit.append({
      eventType: "prompt.created",
      actor: "system:prompt-registry",
      subjectType: "prompt",
      subjectId: row.id,
      payload: { name: row.name, version: row.version, status: row.status },
      parentEventId: null,
    });

    return rowToPrompt(row);
  }

  async update(name: string, input: PromptUpdate): Promise<Prompt> {
    const latest = await this.latestVersion(name);
    if (!latest) {
      throw new Error(`prompt "${name}" does not exist; use create() first`);
    }

    const [row] = await db
      .insert(prompts)
      .values({
        name,
        version: latest.version + 1,
        body: input.body ?? latest.body,
        modelTarget: input.modelTarget ?? latest.modelTarget,
        status: input.status ?? latest.status,
      })
      .returning();
    if (!row) throw new Error("prompt-registry.update: insert returned no row");

    await audit.append({
      eventType: "prompt.updated",
      actor: "system:prompt-registry",
      subjectType: "prompt",
      subjectId: row.id,
      payload: {
        name: row.name,
        version: row.version,
        status: row.status,
        previousVersionId: latest.id,
      },
      parentEventId: null,
    });

    return rowToPrompt(row);
  }

  async get(id: string): Promise<Prompt | null> {
    const [row] = await db
      .select()
      .from(prompts)
      .where(eq(prompts.id, id))
      .limit(1);
    return row ? rowToPrompt(row) : null;
  }

  async getByVersion(name: string, version: number): Promise<Prompt | null> {
    const [row] = await db
      .select()
      .from(prompts)
      .where(and(eq(prompts.name, name), eq(prompts.version, version)))
      .limit(1);
    return row ? rowToPrompt(row) : null;
  }

  async list(filter?: PromptListFilter): Promise<readonly Prompt[]> {
    const conditions = [
      filter?.name !== undefined ? eq(prompts.name, filter.name) : undefined,
      filter?.status !== undefined ? eq(prompts.status, filter.status) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const rows = await db
      .select()
      .from(prompts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(prompts.createdAt))
      .limit(filter?.limit ?? 200);

    return rows.map(rowToPrompt);
  }

  async retire(name: string): Promise<Prompt> {
    const latest = await this.latestVersion(name);
    if (!latest) {
      throw new Error(`prompt "${name}" does not exist`);
    }
    if (latest.status === "retired") {
      throw new Error(`prompt "${name}" is already retired`);
    }

    const [row] = await db
      .insert(prompts)
      .values({
        name,
        version: latest.version + 1,
        body: latest.body,
        modelTarget: latest.modelTarget,
        status: "retired" as PromptStatus,
      })
      .returning();
    if (!row) throw new Error("prompt-registry.retire: insert returned no row");

    await audit.append({
      eventType: "prompt.retired",
      actor: "system:prompt-registry",
      subjectType: "prompt",
      subjectId: row.id,
      payload: {
        name: row.name,
        version: row.version,
        previousVersionId: latest.id,
      },
      parentEventId: null,
    });

    return rowToPrompt(row);
  }

  private async latestVersion(name: string): Promise<Row | null> {
    const [row] = await db
      .select()
      .from(prompts)
      .where(eq(prompts.name, name))
      .orderBy(desc(prompts.version))
      .limit(1);
    return row ?? null;
  }
}

export const promptRegistry: PromptRegistry = new SqlitePromptRegistry();
