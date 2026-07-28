import type { Agent } from "../agents/agentTypes";
import type { Banner, GameState, Keep } from "../engine/engine.types";
import type { ThreatEvent } from "../threat/threatTypes";
import type { CombatSnapshot } from "./combatTransientTypes";

export function snapshotAgents(
  agents: readonly Agent[],
): ReadonlyMap<string, CombatSnapshot> {
  return new Map(
    agents.map((agent) => [
      agent.id,
      {
        x: agent.x,
        y: agent.y,
        hp: agent.hp,
      },
    ]),
  );
}

export function snapshotThreats(
  threat: ThreatEvent | null,
): ReadonlyMap<string, CombatSnapshot> {
  const snapshots = new Map<string, CombatSnapshot>();
  if (threat === null) {
    return snapshots;
  }
  for (const creature of threat.creatures) {
    snapshots.set(`creature:${creature.id}`, {
      x: creature.x,
      y: creature.y,
      hp: creature.hp,
    });
  }
  if (threat.mage !== null) {
    snapshots.set(`mage:${threat.waveIndex}:${threat.startTick}`, {
      x: threat.mage.x,
      y: threat.mage.y,
      hp: threat.mage.hp,
    });
  }
  return snapshots;
}

export function snapshotDefenses(
  keep: Keep,
  banners: readonly Banner[],
): ReadonlyMap<string, CombatSnapshot> {
  return new Map(
    [
      ["keep", { x: keep.x, y: keep.y, hp: keep.hp }],
      ...banners.map((banner) => [
      `banner:${banner.houseId}`,
      {
        x: banner.x,
        y: banner.y,
        hp: banner.hp,
      },
    ] as const),
    ],
  );
}

export function identityForThreat(state: GameState): string | null {
  if (state.phase !== "wave" || state.activeThreat === null) {
    return null;
  }
  return [
    state.activeThreat.type,
    state.activeThreat.waveIndex,
    state.activeThreat.startTick,
    state.activeThreat.daylightRaid === true ? "daylight" : "night",
  ].join(":");
}

export function creatureCountForThreat(threat: ThreatEvent | null): number {
  return threat?.creatures.length ?? 0;
}

export function displayThreatId(threatId: string): string {
  return threatId.startsWith("creature:")
    ? threatId.slice("creature:".length)
    : threatId;
}
