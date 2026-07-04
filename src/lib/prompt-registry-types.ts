/**
 * Copied verbatim from @physical-substrate/prompt-registry (types only) —
 * ShortStay doesn't consume the substrate packages, so the interface lives
 * locally. Keep in sync manually if the substrate evolves.
 *
 * Versioned, immutable storage for named prompts. Updates produce new
 * version rows; existing rows are never mutated.
 */

export type PromptStatus = "draft" | "canary" | "active" | "retired";

export interface Prompt {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly body: string;
  readonly modelTarget: string;
  readonly status: PromptStatus;
  readonly createdAt: Date;
}

export type PromptCreate = Omit<Prompt, "id" | "version" | "createdAt"> & {
  readonly version?: never;
};

export type PromptUpdate = {
  readonly body?: string;
  readonly modelTarget?: string;
  readonly status?: PromptStatus;
};

export interface PromptListFilter {
  readonly name?: string;
  readonly status?: PromptStatus;
  readonly limit?: number;
}

export interface PromptRegistry {
  create(input: PromptCreate): Promise<Prompt>;
  update(name: string, input: PromptUpdate): Promise<Prompt>;
  get(id: string): Promise<Prompt | null>;
  getByVersion(name: string, version: number): Promise<Prompt | null>;
  list(filter?: PromptListFilter): Promise<readonly Prompt[]>;
  retire(name: string): Promise<Prompt>;
}
