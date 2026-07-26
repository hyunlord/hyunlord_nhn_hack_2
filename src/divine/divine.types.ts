export type MiracleType = "lightning" | "blessing" | "curse";

export interface MiracleEvent {
  type: MiracleType;
  targetX: number;
  targetY: number;
  tick: number;
}
