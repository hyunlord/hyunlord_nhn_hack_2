export type HighlightCategory =
  | "betrayal"
  | "sacrifice"
  | "heroism"
  | "victory"
  | "defeat";

export interface Highlight {
  id: string;
  category: HighlightCategory;
  tick: number;
  description: string;
  involvedAgentIds: string[];
}

export function recordHighlights(): Highlight[] {
  // TODO: implement with contribution tracking in Phase 3B.
  return [];
}
