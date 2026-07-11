export type SectionMeta = {
  badge: string;
  subtitle: string;
  bgColor: string;
  bgImage: string;
  paddingTop: number;
  paddingBottom: number;
};

export const DEFAULT_META: SectionMeta = {
  badge: "",
  subtitle: "",
  bgColor: "",
  bgImage: "",
  paddingTop: 96,
  paddingBottom: 96,
};

/** Split raw section payload into (meta, content). */
export function splitMeta<T>(raw: unknown): { meta: SectionMeta; content: T } {
  const obj = (raw && typeof raw === "object" ? { ...(raw as Record<string, unknown>) } : {}) as Record<string, unknown>;
  const rawMeta = (obj._meta as Partial<SectionMeta>) ?? {};
  delete obj._meta;
  return {
    meta: { ...DEFAULT_META, ...rawMeta },
    content: obj as unknown as T,
  };
}

/** Rebuild raw payload from (meta, content). */
export function joinMeta<T>(meta: SectionMeta, content: T): Record<string, unknown> {
  return { ...(content as unknown as Record<string, unknown>), _meta: meta };
}

/** Deep-ish equality for JSON-serializable objects. */
export function jsonEqual(a: unknown, b: unknown): boolean {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}
