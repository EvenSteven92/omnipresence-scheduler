/**
 * Frontend helper for /api/ai/generate.
 * Backend is reachable via the same origin under /api (k8s ingress).
 */
export type AiKind = "caption" | "hashtags" | "yt_desc" | "yt_title" | "internal_notes";

export interface AiGenerateInput {
  kind: AiKind;
  brief: string;
  title?: string;
  tone?: string;
  platforms?: string[];
}

export async function aiGenerate(input: AiGenerateInput): Promise<string> {
  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const j = await res.json();
      detail = j.detail ?? detail;
    } catch {
      /* swallow */
    }
    throw new Error(detail);
  }
  const data = (await res.json()) as { kind: AiKind; text: string };
  return data.text;
}
