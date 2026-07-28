import type { Agent } from "../agents/agentTypes";
import { SHOP_EFFECT_VALUES } from "../build/shopEffects";
import type { Banner, GameState, Keep } from "./engine.types";
import { maxHpForAgent, respawnHeroNow } from "./heroEngine";
import { populationCapForHouse } from "./population";
import { modifiersForAgent } from "./progressionEngine";

type RevivalAnchor = {
  readonly x: number;
  readonly y: number;
};

type RepairTarget =
  | { readonly id: "keep"; readonly hp: number; readonly maxHp: number }
  | {
      readonly id: `banner:${Banner["houseId"]}`;
      readonly houseId: Banner["houseId"];
      readonly hp: number;
      readonly maxHp: number;
    };

export interface ReinforcedStructures {
  readonly keep: Keep;
  readonly banners: GameState["banners"];
}

function bannerStructureId(
  houseId: Banner["houseId"],
): `banner:${Banner["houseId"]}` {
  switch (houseId) {
    case "house_a":
      return "banner:house_a";
    case "house_b":
      return "banner:house_b";
    case "house_c":
      return "banner:house_c";
    case "house_d":
      return "banner:house_d";
    case "house_e":
      return "banner:house_e";
    case "house_f":
      return "banner:house_f";
  }
}

function livingRegularCount(state: GameState, houseId: string): number {
  return state.agents.filter(
    (agent) =>
      !agent.isHero &&
      agent.houseId === houseId &&
      agent.hp > 0,
  ).length;
}

function levelForHouse(state: GameState, houseId: string): number {
  return state.houseProgress.find(
    (progress) => progress.houseId === houseId,
  )?.level ?? 1;
}

function revivalAnchorForHouse(
  state: GameState,
  houseId: Agent["houseId"],
): RevivalAnchor | null {
  const banner = state.banners.find(
    (candidate) => candidate.houseId === houseId && candidate.hp > 0,
  );
  if (banner !== undefined) {
    return banner;
  }
  return state.keep.hp > 0 ? state.keep : null;
}

export function eligibleDeadRegulars(state: GameState): Agent[] {
  return state.agents.filter((agent) => {
    if (
      agent.isHero ||
      agent.hp > 0 ||
      revivalAnchorForHouse(state, agent.houseId) === null
    ) {
      return false;
    }
    return (
      livingRegularCount(state, agent.houseId) <
      populationCapForHouse(agent.houseId, levelForHouse(state, agent.houseId))
    );
  });
}

export function reviveRecruitSquadAgents(state: GameState): Agent[] {
  const dead = eligibleDeadRegulars(state);
  const candidateHouse = [...new Set(dead.map(({ houseId }) => houseId))]
    .sort(
      (first, second) =>
        livingRegularCount(state, first) - livingRegularCount(state, second) ||
        first.localeCompare(second),
    )[0];
  if (candidateHouse === undefined) {
    return state.agents;
  }
  const anchor = revivalAnchorForHouse(state, candidateHouse);
  if (anchor === null) {
    return state.agents;
  }
  const availableCapacity = Math.max(
    0,
    populationCapForHouse(candidateHouse, levelForHouse(state, candidateHouse)) -
      livingRegularCount(state, candidateHouse),
  );
  const revivedIds = new Set(
    dead
      .filter(({ houseId }) => houseId === candidateHouse)
      .sort((first, second) => first.id.localeCompare(second.id))
      .slice(
        0,
        Math.min(SHOP_EFFECT_VALUES.recruitSquadCount, availableCapacity),
      )
      .map(({ id }) => id),
  );
  return state.agents.map((agent) =>
    revivedIds.has(agent.id)
      ? {
          ...agent,
          x: anchor.x,
          y: anchor.y,
          hp: maxHpForAgent(agent, modifiersForAgent(state, agent)),
          state: "idle" as const,
          lastDamagedTick: -1,
          lastAttackTick: state.tick,
        }
      : agent,
  );
}

export function healLivingAgents(state: GameState): Agent[] {
  return state.agents.map((agent) =>
    agent.hp <= 0
      ? agent
      : {
          ...agent,
          hp: Math.max(
            agent.hp,
            Math.min(
              maxHpForAgent(agent, modifiersForAgent(state, agent)),
              agent.hp + SHOP_EFFECT_VALUES.fieldMedicineHeal,
            ),
          ),
        },
  );
}

function repairTargets(state: GameState): RepairTarget[] {
  const targets: RepairTarget[] = [
    {
      id: "keep",
      hp: state.keep.hp,
      maxHp: state.keep.maxHp,
    },
    ...state.banners.map((banner) => ({
      id: bannerStructureId(banner.houseId),
      houseId: banner.houseId,
      hp: banner.hp,
      maxHp: banner.maxHp,
    })),
  ];
  return targets.filter(({ hp, maxHp }) => hp > 0 && hp < maxHp);
}

export function reinforceMostDamagedStronghold(
  state: GameState,
): ReinforcedStructures {
  const target = repairTargets(state)
    .sort(
      (first, second) =>
        first.hp / first.maxHp - second.hp / second.maxHp ||
        first.id.localeCompare(second.id),
    )[0];
  if (target === undefined) {
    return { keep: state.keep, banners: state.banners };
  }
  if (target.id === "keep") {
    return {
      keep: {
        ...state.keep,
        hp: Math.min(
          state.keep.maxHp,
          state.keep.hp + SHOP_EFFECT_VALUES.strongholdRepair,
        ),
      },
      banners: state.banners,
    };
  }
  return {
    keep: state.keep,
    banners: state.banners.map((banner) =>
      banner.houseId === target.houseId
        ? {
            ...banner,
            hp: Math.min(
              banner.maxHp,
              banner.hp + SHOP_EFFECT_VALUES.strongholdRepair,
            ),
          }
        : banner,
    ),
  };
}

export function reviveHero(state: GameState): Agent[] {
  const hero = [...state.agents]
    .filter(({ isHero, hp }) => isHero && hp <= 0)
    .sort((first, second) => first.id.localeCompare(second.id))[0];
  if (hero === undefined) {
    return state.agents;
  }
  return state.agents.map((agent) =>
    agent.id === hero.id
      ? respawnHeroNow(
          agent,
          state.keep,
          state.banners,
          [{
            agentId: agent.id,
            houseId: agent.houseId,
            modifiers: modifiersForAgent(state, agent),
          }],
          state.tick,
        )
      : agent,
  );
}
