import {
  decideIntent,
  intentToState,
  type DefenseContext,
} from "../agents/dispositionEngine";
import { stepAgent } from "../agents/movement";
import type {
  Agent,
  ThreatPresence,
} from "../agents/agentTypes";
import { stepThreat } from "../threat/waveDirector";
import type { ThreatEvent } from "../threat/threatTypes";
import type { GameState, Hall } from "./engine.types";
import type { Rng } from "./prng";
import {
  applyHallDamages,
  applyThreatDamages,
} from "./combatDamage";
import {
  applyAgentAttacks,
  type AgentDecision,
} from "./agentCombat";

type Point = { readonly x: number; readonly y: number };
type WaveCombatStep = Pick<
  GameState,
  "agents" | "halls" | "activeThreat"
> & {
  readonly creatureKills: number;
  readonly xpAwards: {
    readonly houseId: string;
    readonly xp: number;
  }[];
  readonly creatureKillsByHouse: {
    readonly houseId: string;
    readonly kills: number;
  }[];
};

function distanceSquared(first: Point, second: Point): number {
  return (first.x - second.x) ** 2 + (first.y - second.y) ** 2;
}

function toThreatPresences(threat: ThreatEvent | null): ThreatPresence[] {
  if (threat === null) {
    return [];
  }
  const presences = threat.creatures.map(({ id, x, y }) => ({
    id,
    x,
    y,
    hostile: true,
  }));
  return threat.mage !== null && threat.mage.hp > 0
    ? [
        ...presences,
        {
          id: "mage",
          x: threat.mage.x,
          y: threat.mage.y,
          hostile: true,
        },
      ]
    : presences;
}

function createDefenseContext(
  agent: Agent,
  halls: readonly Hall[],
  threats: readonly ThreatPresence[],
): DefenseContext {
  const ownHall =
    halls.find(
      (hall) => hall.houseId === agent.houseId && hall.hp > 0,
    ) ?? null;
  const rallyHall =
    ownHall ??
    [...halls]
      .filter((hall) => hall.hp > 0)
      .sort((first, second) => {
        const delta =
          distanceSquared(agent, first) - distanceSquared(agent, second);
        return delta === 0
          ? first.houseId.localeCompare(second.houseId)
          : delta;
      })[0] ??
    null;
  return {
    ownHall:
      ownHall === null
        ? null
        : { x: ownHall.x, y: ownHall.y, hp: ownHall.hp },
    rallyHall:
      rallyHall === null ? null : { x: rallyHall.x, y: rallyHall.y },
    threats,
  };
}

function moveAgents(
  agents: readonly Agent[],
  halls: readonly Hall[],
  threat: ThreatEvent | null,
  rng: Rng,
  modifiersByHouse: GameState["houseModifiers"],
): AgentDecision[] {
  const threats = toThreatPresences(threat);
  const decisions = agents.map((agent) => {
    const context = createDefenseContext(agent, halls, threats);
    const modifiers = modifiersByHouse.find(
      (entry) => entry.houseId === agent.houseId,
    )?.modifiers;
    if (modifiers === undefined) {
      throw new RangeError(`Missing modifiers for ${agent.houseId}.`);
    }
    const intent = decideIntent(
      agent,
      context,
      threat?.traitorHouseId === agent.houseId,
      modifiers,
    );
    return {
      agent: stepAgent(agent, rng, intent, modifiers),
      intent,
      context,
    };
  });

  return decisions.map(({ agent, intent, context }) => {
    if (agent.state === "dead") {
      return { agent, intent };
    }
    const state = intentToState(intent);
    if (intent.kind !== "engage" || intent.targetId === null) {
      return {
        agent: {
          ...agent,
          state: intent.kind === "engage" ? "idle" : state,
        },
        intent,
      };
    }
    return {
      agent: {
        ...agent,
        state: context.ownHall === null ? "helping" : state,
      },
      intent,
    };
  });
}

export function advanceWaveCombat(
  state: GameState,
  tick: number,
  rng: Rng,
): WaveCombatStep {
  if (state.activeThreat === null) {
    return {
      agents: state.agents,
      halls: state.halls,
      activeThreat: null,
      creatureKills: 0,
      xpAwards: [],
      creatureKillsByHouse: [],
    };
  }

  const initialCreatureCount = state.activeThreat.creatures.length;
  const decisions = moveAgents(
    state.agents,
    state.halls,
    state.activeThreat,
    rng,
    state.houseModifiers,
  );
  const modifiersByHouse = new Map(
    state.houseModifiers.map(({ houseId, modifiers }) => [
      houseId,
      modifiers,
    ]),
  );
  const attacks = applyAgentAttacks(
    decisions,
    state.activeThreat,
    tick,
    modifiersByHouse,
  );
  const stepped = stepThreat(
    attacks.threat,
    attacks.agents,
    state.halls.map(({ houseId, x, y, hp }) => ({
      id: houseId,
      x,
      y,
      hp,
    })),
    tick,
  );

  return {
    agents: applyThreatDamages(
      attacks.agents,
      stepped.agentDamages,
      tick,
    ),
    halls: applyHallDamages(state.halls, stepped.hallDamages),
    activeThreat: stepped.threat,
    creatureKills:
      initialCreatureCount - stepped.threat.creatures.length,
    xpAwards: attacks.xpAwards.map(({ houseId, amount }) => ({
      houseId,
      xp: amount,
    })),
    creatureKillsByHouse: attacks.creatureKillsByHouse.map(
      ({ houseId, amount }) => ({ houseId, kills: amount }),
    ),
  };
}
