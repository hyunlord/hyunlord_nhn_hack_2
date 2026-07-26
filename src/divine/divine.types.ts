export type MiracleType = "lightning" | "blessing" | "curse";

export interface MiracleEvent {
  readonly type: MiracleType;
  readonly targetX: number;
  readonly targetY: number;
  readonly tick: number;
}

export interface MiracleTargetSnapshot {
  readonly id: string;
  readonly houseId: string;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
}

export interface AgentDamage {
  readonly agentId: string;
  readonly amount: number;
}

export interface AgentHeal {
  readonly agentId: string;
  readonly amount: number;
}

export interface HousePowerDelta {
  readonly houseId: string;
  readonly amount: number;
}

export interface MiracleOutcome {
  readonly id: string;
  readonly type: MiracleType;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly color: string;
  readonly startTick: number;
  readonly durationTicks: number;
  readonly damages: AgentDamage[];
  readonly heals: AgentHeal[];
  readonly housePowerDeltas: HousePowerDelta[];
}
