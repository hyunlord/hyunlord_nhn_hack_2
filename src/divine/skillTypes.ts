export type DivineSkillId =
  | "meteor_fall"
  | "sanctuary"
  | "chains_of_dusk"
  | "resurgence";

export interface DivineSkillDefinition {
  readonly id: DivineSkillId;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly cooldownTicks: number;
  readonly radius: number;
  readonly color: string;
  readonly targeted: boolean;
}

export interface DivineSkillEvent {
  readonly type: DivineSkillId;
  readonly targetX: number;
  readonly targetY: number;
  readonly tick: number;
}
