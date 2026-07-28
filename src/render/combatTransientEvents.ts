import type { GameState } from "../engine/engine.types";
import {
  creatureCountForThreat,
  displayThreatId,
  identityForThreat,
  snapshotAgents,
  snapshotDefenses,
  snapshotThreats,
} from "./combatTransientSnapshots";
import {
  DEATH_PUFF_TICKS,
  DEFENSE_DANGER_RATIO,
  DEFENSE_PULSE_TICKS,
  SHAKE_TICKS,
  WAVE_BANNER_TICKS,
  type CombatTransientEvent,
  type CombatTransientTracker,
  type CombatTransientUpdate,
} from "./combatTransientTypes";

export function createCombatTransientTracker(): CombatTransientTracker {
  return {
    agents: new Map(),
    threats: new Map(),
    defenses: new Map(),
    threatIdentity: null,
    activeEvents: [],
    shakenDefenseIds: new Set(),
  };
}

export function updateCombatTransients(
  state: GameState,
  tracker: CombatTransientTracker,
): CombatTransientUpdate {
  const agentSnapshots = snapshotAgents(state.agents);
  const threatSnapshots = snapshotThreats(state.activeThreat);
  const defenseSnapshots = snapshotDefenses(state.keep, state.banners);
  const threatIdentity = identityForThreat(state);

  if (state.phase === "victory" || state.phase === "defeat") {
    const nextTracker = {
      agents: agentSnapshots,
      threats: threatSnapshots,
      defenses: defenseSnapshots,
      threatIdentity,
      activeEvents: [],
      shakenDefenseIds: tracker.shakenDefenseIds,
    };
    return { tracker: nextTracker, events: [], newEvents: [] };
  }

  const activeEvents = activeEventsAt(tracker.activeEvents, state.tick);
  const newEvents = [
    ...deathPuffsForAgents(state, tracker, activeEvents, agentSnapshots),
    ...deathPuffsForThreats(state, tracker, activeEvents, threatSnapshots),
    ...defenseDamageEvents(state, tracker, activeEvents),
    ...bannerDestroyedEvents(state, tracker),
    ...waveBannerEvents(state, tracker, threatIdentity),
  ];
  const nextEvents =
    newEvents.some(({ kind }) => kind === "wave_banner")
      ? [
          ...activeEvents.filter(({ kind }) => kind !== "wave_banner"),
          ...newEvents,
        ]
      : [...activeEvents, ...newEvents];
  const nextTracker = {
    agents: agentSnapshots,
    threats: threatSnapshots,
    defenses: defenseSnapshots,
    threatIdentity,
    activeEvents: nextEvents,
    shakenDefenseIds: shakenDefenseIdsAfter(tracker, newEvents),
  };

  return { tracker: nextTracker, events: nextEvents, newEvents };
}

function deathPuffsForAgents(
  state: GameState,
  tracker: CombatTransientTracker,
  activeEvents: readonly CombatTransientEvent[],
  agentSnapshots: CombatTransientTracker["agents"],
): readonly CombatTransientEvent[] {
  const events: CombatTransientEvent[] = [];
  for (const [agentId, previous] of tracker.agents.entries()) {
    const current = agentSnapshots.get(agentId);
    if (
      previous.hp > 0 &&
      (current === undefined || current.hp <= 0) &&
      !hasEvent(activeEvents, `agent:${agentId}:${state.tick}`)
    ) {
      events.push({
        kind: "death_puff",
        id: `agent:${agentId}:${state.tick}`,
        x: previous.x,
        y: previous.y,
        startTick: state.tick,
        durationTicks: DEATH_PUFF_TICKS,
        target: "agent",
      });
    }
  }
  return events;
}

function deathPuffsForThreats(
  state: GameState,
  tracker: CombatTransientTracker,
  activeEvents: readonly CombatTransientEvent[],
  threatSnapshots: CombatTransientTracker["threats"],
): readonly CombatTransientEvent[] {
  const events: CombatTransientEvent[] = [];
  for (const [threatId, previous] of tracker.threats.entries()) {
    const current = threatSnapshots.get(threatId);
    const eventId = `threat:${displayThreatId(threatId)}:${state.tick}`;
    if (
      previous.hp > 0 &&
      (current === undefined || current.hp <= 0) &&
      !hasEvent(activeEvents, eventId)
    ) {
      events.push({
        kind: "death_puff",
        id: eventId,
        x: previous.x,
        y: previous.y,
        startTick: state.tick,
        durationTicks: DEATH_PUFF_TICKS,
        target: "threat",
      });
    }
  }
  return events;
}

function defenseDamageEvents(
  state: GameState,
  tracker: CombatTransientTracker,
  activeEvents: readonly CombatTransientEvent[],
): readonly CombatTransientEvent[] {
  const events: CombatTransientEvent[] = [];
  const defenses = [
    { id: "keep", ...state.keep },
    ...state.banners.map((banner) => ({
      id: `banner:${banner.houseId}`,
      ...banner,
    })),
  ];
  for (const defense of defenses) {
    const previous = tracker.defenses.get(defense.id);
    if (previous === undefined || defense.hp >= previous.hp) {
      continue;
    }
    if (!hasEvent(activeEvents, `${defense.id}:pulse`)) {
      events.push({
        kind: "defense_pulse",
        id: `${defense.id}:pulse`,
        x: defense.x,
        y: defense.y,
        startTick: state.tick,
        durationTicks: DEFENSE_PULSE_TICKS,
        hpBefore: previous.hp,
        hpAfter: defense.hp,
      });
    }
    if (
      crossedDangerThreshold(defense.maxHp, previous.hp, defense.hp) &&
      !tracker.shakenDefenseIds.has(defense.id)
    ) {
      events.push({
        kind: "shake",
        id: `${defense.id}:shake`,
        startTick: state.tick,
        durationTicks: SHAKE_TICKS,
        strength: 5,
      });
    }
  }
  return events;
}

function bannerDestroyedEvents(
  state: GameState,
  tracker: CombatTransientTracker,
): readonly CombatTransientEvent[] {
  return state.banners.flatMap((banner) => {
    const previous = tracker.defenses.get(`banner:${banner.houseId}`);
    return previous !== undefined && previous.hp > 0 && banner.hp <= 0
      ? [{
          kind: "banner_destroyed" as const,
          id: `banner:${banner.houseId}:destroyed`,
          startTick: state.tick,
          durationTicks: WAVE_BANNER_TICKS,
          houseId: banner.houseId,
        }]
      : [];
  });
}

function waveBannerEvents(
  state: GameState,
  tracker: CombatTransientTracker,
  threatIdentity: string | null,
): readonly CombatTransientEvent[] {
  if (
    state.phase !== "wave" ||
    state.activeThreat === null ||
    threatIdentity === null ||
    threatIdentity === tracker.threatIdentity
  ) {
    return [];
  }
  return [{
    kind: "wave_banner",
    id: `wave:${state.activeThreat.waveIndex}:${state.activeThreat.startTick}`,
    startTick: state.tick,
    durationTicks: WAVE_BANNER_TICKS,
    wave: state.activeThreat.waveIndex + 1,
    daylightRaid: state.activeThreat.daylightRaid === true,
    creatureCount: creatureCountForThreat(state.activeThreat),
  }];
}

function crossedDangerThreshold(
  maxHp: number,
  previousHp: number,
  currentHp: number,
): boolean {
  const threshold = maxHp * DEFENSE_DANGER_RATIO;
  return previousHp >= threshold && currentHp < threshold;
}

function shakenDefenseIdsAfter(
  tracker: CombatTransientTracker,
  events: readonly CombatTransientEvent[],
): ReadonlySet<string> {
  const shakenDefenseIds = new Set(tracker.shakenDefenseIds);
  for (const event of events) {
    if (event.kind === "shake") {
      shakenDefenseIds.add(event.id.slice(0, -":shake".length));
    }
  }
  return shakenDefenseIds;
}

function activeEventsAt(
  events: readonly CombatTransientEvent[],
  currentTick: number,
): readonly CombatTransientEvent[] {
  return events.filter(
    (event) =>
      currentTick >= event.startTick &&
      currentTick < event.startTick + event.durationTicks,
  );
}

function hasEvent(
  events: readonly CombatTransientEvent[],
  id: string,
): boolean {
  return events.some((event) => event.id === id);
}
