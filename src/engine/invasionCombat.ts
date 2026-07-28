import {
  decideIntent,
  intentToState,
  type DefenseContext,
} from "../agents/dispositionEngine";
import { stepAgent } from "../agents/movement";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { HouseId } from "../content/houseConfig";
import type {
  Agent,
  ThreatPresence,
} from "../agents/agentTypes";
import { stepThreat } from "../threat/waveDirector";
import type {
  DefenseStructureId,
  DefenseStructureSnapshot,
  ThreatEvent,
} from "../threat/threatTypes";
import type { Banner, GameState, Keep } from "./engine.types";
import type { Rng } from "./prng";
import {
  applyDefenseStructureDamages,
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
import type { TowerDestroyed } from "../build/build.types";
import { modifiersForAgent } from "./progressionEngine";

type Point = { readonly x: number; readonly y: number };
type DefensiveAnchor = Point & {
  readonly houseId: string;
  readonly hp: number;
};
type BannerStructureId = Extract<DefenseStructureId, `banner:${HouseId}`>;
type WaveCombatStep = Pick<
  GameState,
  | "agents"
  | "keep"
  | "banners"
  | "activeThreat"
  | "towers"
  | "rangedAttackEffects"
> & {
  readonly creatureKills: number;
  readonly xpAwards: {
    readonly houseId: string;
    readonly xp: number;
  }[];
  readonly heroXpAwards: {
    readonly heroId: string;
    readonly xp: number;
  }[];
  readonly creatureKillsByHouse: {
    readonly houseId: string;
    readonly kills: number;
  }[];
  readonly destroyedTowers: TowerDestroyed[];
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
  keep: Keep,
  banners: readonly Banner[],
  threats: readonly ThreatPresence[],
  hallDefenseRadiusBonus: number,
  tick: number,
): DefenseContext {
  const livingBanners = banners.filter((banner) => banner.hp > 0);
  const livingKeep =
    keep.hp > 0
      ? { houseId: "keep", x: keep.x, y: keep.y, hp: keep.hp }
      : null;
  const anchors: DefensiveAnchor[] =
    livingKeep === null
      ? [...livingBanners]
      : [...livingBanners, livingKeep];
  const ownBanner =
    livingBanners.find((banner) => banner.houseId === agent.houseId) ?? null;
  const rallyAnchor =
    ownBanner ??
    [...anchors]
      .sort((first, second) => {
        const delta =
          distanceSquared(agent, first) - distanceSquared(agent, second);
        return delta === 0
          ? first.houseId.localeCompare(second.houseId)
          : delta;
      })[0] ?? null;
  const threatenedHalls = anchors
    .map((anchor) => ({
      houseId: anchor.houseId,
      x: anchor.x,
      y: anchor.y,
      hostileCount: threats.filter(
        (threat) =>
          threat.hostile &&
          distanceSquared(threat, anchor) <=
            (BALANCE_CONFIG.AGENT_THREAT_SENSE_RADIUS +
              hallDefenseRadiusBonus) ** 2,
      ).length,
    }))
    .filter(({ hostileCount }) => hostileCount > 0);
  return {
    tick,
    ownHall:
      ownBanner === null
        ? null
        : { x: ownBanner.x, y: ownBanner.y, hp: ownBanner.hp },
    rallyHall:
      rallyAnchor === null
        ? null
        : { x: rallyAnchor.x, y: rallyAnchor.y },
    threatenedHalls,
    threats,
  };
}

function moveAgents(
  agents: readonly Agent[],
  keep: Keep,
  banners: readonly Banner[],
  threat: ThreatEvent | null,
  rng: Rng,
  state: GameState,
  tick: number,
): AgentDecision[] {
  const threats = toThreatPresences(threat);
  const decisions = agents.map((agent) => {
    const modifiers = modifiersForAgent(state, agent);
    const context = createDefenseContext(
      agent,
      keep,
      banners,
      threats,
      modifiers.hallDefenseRadiusBonus,
      tick,
    );
    const intent = decideIntent(
      agent,
      context,
      threat?.traitorHouseId === agent.houseId,
      {
        ...modifiers,
        maxHpMultiplier:
          modifiers.maxHpMultiplier *
          heroMaxHpMultiplierForAgent(agent),
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

function bannerStructureId(houseId: HouseId): BannerStructureId {
  return `banner:${houseId}`;
}

function createDefenseSnapshots(
  keep: Keep,
  banners: readonly Banner[],
): DefenseStructureSnapshot[] {
  return [
    {
      kind: "keep",
      id: "keep",
      x: keep.x,
      y: keep.y,
      hp: keep.hp,
      radius: BALANCE_CONFIG.KEEP_RADIUS,
    },
    ...banners.map((banner) => ({
      kind: "banner" as const,
      id: bannerStructureId(banner.houseId),
      houseId: banner.houseId,
      x: banner.x,
      y: banner.y,
      hp: banner.hp,
      radius: BALANCE_CONFIG.BANNER_RADIUS,
    })),
  ];
}

export function advanceWaveCombat(
  state: GameState,
  tick: number,
  rng: Rng,
): WaveCombatStep {
  if (state.activeThreat === null) {
    return {
      agents: state.agents,
      keep: state.keep,
      banners: state.banners,
      towers: state.towers,
      activeThreat: null,
      rangedAttackEffects: state.rangedAttackEffects,
      creatureKills: 0,
      xpAwards: [],
      heroXpAwards: [],
      creatureKillsByHouse: [],
      destroyedTowers: [],
    };
  }

  const initialCreatureCount = state.activeThreat.creatures.length;
  const decisions = moveAgents(
    state.agents,
    state.keep,
    state.banners,
    state.activeThreat,
    rng,
    state,
    tick,
  );
  const modifiersByAgent = new Map(
    decisions.map(({ agent }) => [
      agent.id,
      modifiersForAgent(state, agent),
    ]),
  );
  const modifierEntries = decisions.map(({ agent }) => ({
    agentId: agent.id,
    houseId: agent.houseId,
    modifiers: modifiersForAgent(state, agent),
  }));
  const attacks = applyAgentAttacks(
    decisions,
    state.activeThreat,
    tick,
    modifiersByAgent,
    combatBonusesForAgents(
      decisions.map(({ agent }) => agent),
      modifierEntries,
      state.runUpgrades.attackDamageMultiplier,
    ),
    {
      houseProgress: state.houseProgress,
      hallLowestHpRatio: Math.min(
        state.keep.hp / state.keep.maxHp,
        ...state.banners
          .filter(({ maxHp }) => maxHp > 0)
          .map(({ hp, maxHp }) => hp / maxHp),
      ),
    },
  );
  const towerAttacks = applyTowerAttacks(
    state.towers,
    attacks.threat,
    tick,
  );
  const stepped = stepThreat(
    towerAttacks.threat,
    attacks.agents,
    createDefenseSnapshots(state.keep, state.banners),
    tick,
    towerAttacks.towers.map(({ id, x, y, hp }) => ({
      id,
      x,
      y,
      hp,
      radius: TOWER_RADIUS,
    })),
  );

  const towerDamage = applyTowerDamages(
    towerAttacks.towers,
    stepped.structureDamages,
    tick,
  );
  const defenseDamage = applyDefenseStructureDamages(
    state.keep,
    state.banners,
    stepped.defenseStructureDamages,
  );

  return {
    agents: applyThreatDamages(
      attacks.agents,
      stepped.agentDamages,
      tick,
      modifierEntries,
      state.houseProgress,
    ),
    keep: defenseDamage.keep,
    banners: defenseDamage.banners,
    towers: towerDamage.towers,
    activeThreat: stepped.threat,
    creatureKills:
      initialCreatureCount - stepped.threat.creatures.length,
    xpAwards: attacks.xpAwards.map(({ houseId, amount }) => ({
      houseId,
      xp: amount,
    })),
    heroXpAwards: attacks.heroXpAwards.map(({ heroId, amount }) => ({
      heroId,
      xp: amount,
    })),
    creatureKillsByHouse: attacks.creatureKillsByHouse.map(
      ({ houseId, amount }) => ({ houseId, kills: amount }),
    ),
    destroyedTowers: towerDamage.destroyed,
    rangedAttackEffects: [
      ...state.rangedAttackEffects.filter(
        (effect) => tick < effect.startTick + effect.durationTicks,
      ),
      ...attacks.rangedAttackEffects,
    ],
  };
}
