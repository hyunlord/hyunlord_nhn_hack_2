import {
  decideIntent,
  intentToState,
  type DefenseContext,
} from "../agents/dispositionEngine";
import { stepAgent } from "../agents/movement";
import { BALANCE_CONFIG } from "../content/balanceConfig";
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
  applyTowerDamages,
  applyThreatDamages,
} from "./combatDamage";
import {
  applyAgentAttacks,
  type AgentDecision,
} from "./agentCombat";
import {
  combatBonusesForAgents,
  heroMaxHpMultiplierForAgent,
  movementMultiplierForAgent,
} from "./heroEngine";
import { applyTowerAttacks } from "./towerCombat";
import { TOWER_RADIUS } from "../build/structures";

type Point = { readonly x: number; readonly y: number };
type WaveCombatStep = Pick<
  GameState,
  "agents" | "halls" | "activeThreat"
  | "towers"
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
  const threatenedHalls = halls
    .filter((hall) => hall.hp > 0)
    .map((hall) => ({
      houseId: hall.houseId,
      x: hall.x,
      y: hall.y,
      hostileCount: threats.filter(
        (threat) =>
          threat.hostile &&
          distanceSquared(threat, hall) <=
            BALANCE_CONFIG.HALL_DEFENSE_RADIUS ** 2,
      ).length,
    }))
    .filter(({ hostileCount }) => hostileCount > 0);
  return {
    ownHall:
      ownHall === null
        ? null
        : { x: ownHall.x, y: ownHall.y, hp: ownHall.hp },
    rallyHall:
      rallyHall === null ? null : { x: rallyHall.x, y: rallyHall.y },
    threatenedHalls,
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
      {
        ...modifiers,
        maxHpMultiplier: heroMaxHpMultiplierForAgent(agent),
      },
    );
    return {
      agent: stepAgent(agent, rng, intent, {
        moveSpeedMultiplier:
          modifiers.moveSpeedMultiplier *
          movementMultiplierForAgent(agent),
      }),
      intent,
      context,
    };
  });

  return decisions.map(({ agent, intent }) => {
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
        state,
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
      towers: state.towers,
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
    combatBonusesForAgents(
      decisions.map(({ agent }) => agent),
      state.houseModifiers,
      state.runUpgrades.attackDamageMultiplier,
    ),
  );
  const towerAttacks = applyTowerAttacks(
    state.towers,
    attacks.threat,
    tick,
  );
  const stepped = stepThreat(
    towerAttacks.threat,
    attacks.agents,
    state.halls.map(({ houseId, x, y, hp }) => ({
      id: houseId,
      x,
      y,
      hp,
    })),
    tick,
    towerAttacks.towers.map(({ id, x, y, hp }) => ({
      id,
      x,
      y,
      hp,
      radius: TOWER_RADIUS,
    })),
  );

  return {
    agents: applyThreatDamages(
      attacks.agents,
      stepped.agentDamages,
      tick,
      state.houseModifiers,
    ),
    halls: applyHallDamages(state.halls, stepped.hallDamages),
    towers: applyTowerDamages(
      towerAttacks.towers,
      stepped.structureDamages,
    ),
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
