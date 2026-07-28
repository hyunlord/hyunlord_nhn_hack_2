import type { GameState } from "../engine/engine.types";
import {
  creatureCountForThreat,
  displayThreatId,
  identityForThreat,
  snapshotAgents,
  snapshotHalls,
  snapshotThreats,
} from "./combatTransientSnapshots";
import {
  DEATH_PUFF_TICKS,
  HALL_DANGER_RATIO,
  HALL_PULSE_TICKS,
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
    halls: new Map(),
    threatIdentity: null,
    activeEvents: [],
    shakenHallIds: new Set(),
  };
}

export function updateCombatTransients(
  state: GameState,
  tracker: CombatTransientTracker,
): CombatTransientUpdate {
  const agentSnapshots = snapshotAgents(state.agents);
  const threatSnapshots = snapshotThreats(state.activeThreat);
  const hallSnapshots = snapshotHalls(state.halls);
  const threatIdentity = identityForThreat(state);

  if (state.phase === "victory" || state.phase === "defeat") {
    const nextTracker = {
      agents: agentSnapshots,
      threats: threatSnapshots,
      halls: hallSnapshots,
      threatIdentity,
      activeEvents: [],
      shakenHallIds: tracker.shakenHallIds,
    };
    return { tracker: nextTracker, events: [], newEvents: [] };
  }

  const activeEvents = activeEventsAt(tracker.activeEvents, state.tick);
  const newEvents = [
    ...deathPuffsForAgents(state, tracker, activeEvents, agentSnapshots),
    ...deathPuffsForThreats(state, tracker, activeEvents, threatSnapshots),
    ...hallDamageEvents(state, tracker, activeEvents),
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
    halls: hallSnapshots,
    threatIdentity,
    activeEvents: nextEvents,
    shakenHallIds: shakenHallIdsAfter(state, tracker, newEvents),
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

function hallDamageEvents(
  state: GameState,
  tracker: CombatTransientTracker,
  activeEvents: readonly CombatTransientEvent[],
): readonly CombatTransientEvent[] {
  const events: CombatTransientEvent[] = [];
  for (const hall of state.halls) {
    const previous = tracker.halls.get(hall.houseId);
    if (previous === undefined || hall.hp >= previous.hp) {
      continue;
    }
    if (!hasEvent(activeEvents, `hall:${hall.houseId}:pulse`)) {
      events.push({
        kind: "hall_pulse",
        id: `hall:${hall.houseId}:pulse`,
        x: hall.x,
        y: hall.y,
        startTick: state.tick,
        durationTicks: HALL_PULSE_TICKS,
        hpBefore: previous.hp,
        hpAfter: hall.hp,
      });
    }
    if (
      crossedDangerThreshold(hall.maxHp, previous.hp, hall.hp) &&
      !tracker.shakenHallIds.has(hall.houseId)
    ) {
      events.push({
        kind: "shake",
        id: `hall:${hall.houseId}:shake`,
        startTick: state.tick,
        durationTicks: SHAKE_TICKS,
        strength: 5,
      });
    }
  }
  return events;
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
  const threshold = maxHp * HALL_DANGER_RATIO;
  return previousHp >= threshold && currentHp < threshold;
}

function shakenHallIdsAfter(
  state: GameState,
  tracker: CombatTransientTracker,
  events: readonly CombatTransientEvent[],
): ReadonlySet<string> {
  const shakenHallIds = new Set(tracker.shakenHallIds);
  for (const event of events) {
    if (event.kind === "shake") {
      const hallId = state.halls.find(
        (hall) => event.id === `hall:${hall.houseId}:shake`,
      )?.houseId;
      if (hallId !== undefined) {
        shakenHallIds.add(hallId);
      }
    }
  }
  return shakenHallIds;
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
