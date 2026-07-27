import { CARD_DEFINITIONS } from "../content/cardConfig";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import { generateOffer } from "../progression/cardPool";
import {
  resolveModifiers,
  type ResolvedModifiers,
} from "../progression/modifiers";
import {
  heroLevelForXp,
  levelForXp,
} from "../progression/xp";
import type { DraftOffer } from "../progression/progression.types";
import type { Rng } from "./prng";
import type { GameState } from "./engine.types";
import type { DivineModifiers } from "../divine/divine.types";
import { maxHpForAgent } from "./heroEngine";
import type { Agent } from "../agents/agentTypes";
import type { UnitClassId } from "../content/unitClassConfig";

export interface ProgressionAward {
  readonly houseId: string;
  readonly xp: number;
}

export interface HeroProgressionAward {
  readonly heroId: string;
  readonly xp: number;
}

export function applyHeroProgressAwards(
  state: GameState,
  awards: readonly HeroProgressionAward[],
  tick: number,
): GameState {
  const xpByHero = new Map<string, number>();
  for (const { heroId, xp } of awards) {
    if (xp > 0) {
      xpByHero.set(heroId, (xpByHero.get(heroId) ?? 0) + xp);
    }
  }
  if (xpByHero.size === 0) {
    return state;
  }
  const levelsByHero = new Map<string, number>();
  const heroProgress = state.heroProgress.map((progress) => {
    const award = xpByHero.get(progress.heroId) ?? 0;
    if (award === 0) {
      return progress;
    }
    const xp = progress.xp + award;
    const level = heroLevelForXp(xp);
    levelsByHero.set(progress.heroId, level);
    return { ...progress, xp, level };
  });
  const agents = state.agents.map((agent) => {
    if (agent.heroId === null) {
      return agent;
    }
    const level = levelsByHero.get(agent.heroId);
    if (level === undefined || level === agent.heroLevel) {
      return agent;
    }
    const gainedLevels = level - agent.heroLevel;
    return {
      ...agent,
      heroLevel: level,
      heroLevelUpTick: tick,
      hp:
        agent.hp > 0
          ? agent.hp +
            BALANCE_CONFIG.HERO_LEVEL_HP_BONUS * gainedLevels
          : agent.hp,
    };
  });
  return { ...state, agents, heroProgress };
}

export function modifiersForHouse(
  state: GameState,
  houseId: string,
  unitClass?: UnitClassId,
): ResolvedModifiers {
  if (unitClass !== undefined) {
    const progress = state.houseProgress.find(
      (entry) => entry.houseId === houseId,
    );
    if (progress === undefined) {
      throw new RangeError(`Missing progress for ${houseId}.`);
    }
    return resolveModifiers(
      CARD_DEFINITIONS,
      progress.cards,
      progress.level - 1,
      baseEffectsForHouse(state, houseId),
      unitClass,
    );
  }
  const result = state.houseModifiers.find(
    (entry) => entry.houseId === houseId,
  )?.modifiers;
  if (result === undefined) {
    throw new RangeError(`Missing modifiers for ${houseId}.`);
  }
  return result;
}

export function modifiersForAgent(
  state: GameState,
  agent: Pick<Agent, "houseId" | "unitClass">,
): ResolvedModifiers {
  return modifiersForHouse(state, agent.houseId, agent.unitClass);
}

function baseEffectsForHouse(
  state: GameState,
  houseId: string,
) {
  const effects = state.houseBaseEffects.find(
    (entry) => entry.houseId === houseId,
  )?.effects;
  if (effects === undefined) {
    throw new RangeError(`Missing base effects for ${houseId}.`);
  }
  return effects;
}

export function divineModifiersForState(
  state: GameState,
): DivineModifiers {
  return state.houseModifiers.reduce<DivineModifiers>(
    (combined, { modifiers }) => ({
      divineRegenMultiplier:
        combined.divineRegenMultiplier *
        modifiers.divineRegenMultiplier,
      divineCostMultiplier:
        combined.divineCostMultiplier *
        modifiers.divineCostMultiplier,
      miracleRadiusMultiplier:
        combined.miracleRadiusMultiplier *
        modifiers.miracleRadiusMultiplier,
      miracleHealMultiplier:
        combined.miracleHealMultiplier *
        modifiers.miracleHealMultiplier,
    }),
    {
      divineRegenMultiplier:
        state.runSharedModifiers.divineRegenMultiplier,
      divineCostMultiplier:
        state.runSharedModifiers.divineCostMultiplier,
      miracleRadiusMultiplier:
        state.runSharedModifiers.miracleRadiusMultiplier,
      miracleHealMultiplier:
        state.runSharedModifiers.miracleHealMultiplier,
    },
  );
}

function healForEffectiveMaxHpIncrease(
  state: GameState,
  houseId: string,
  previousCards: GameState["houseProgress"][number]["cards"],
  previousLevel: number,
  nextCards: GameState["houseProgress"][number]["cards"],
  nextLevel: number,
): GameState["agents"] {
  return state.agents.map((agent) => {
    if (agent.houseId !== houseId || agent.hp <= 0) {
      return agent;
    }
    const baseEffects = baseEffectsForHouse(state, houseId);
    const previousModifiers = resolveModifiers(
      CARD_DEFINITIONS,
      previousCards,
      previousLevel - 1,
      baseEffects,
      agent.unitClass,
    );
    const nextModifiers = resolveModifiers(
      CARD_DEFINITIONS,
      nextCards,
      nextLevel - 1,
      baseEffects,
      agent.unitClass,
    );
    const increase =
      maxHpForAgent(agent, nextModifiers) -
      maxHpForAgent(agent, previousModifiers);
    return increase > 0 ? { ...agent, hp: agent.hp + increase } : agent;
  });
}

function replaceModifiers(
  state: GameState,
  houseId: string,
  modifiers: ResolvedModifiers,
): GameState["houseModifiers"] {
  return state.houseModifiers.map((entry) =>
    entry.houseId === houseId
      ? { houseId, modifiers }
      : entry,
  );
}

function ownedHeroIdsForHouse(
  state: GameState,
  houseId: string,
): string[] {
  return state.agents.flatMap((agent) =>
    agent.houseId === houseId &&
    agent.isHero &&
    agent.heroId !== null
      ? [agent.heroId]
      : [],
  );
}

export function applyProgressionAwards(
  state: GameState,
  awards: readonly ProgressionAward[],
  rng: Rng,
): GameState {
  const xpByHouse = new Map<string, number>();
  for (const { houseId, xp } of awards) {
    if (xp > 0) {
      xpByHouse.set(houseId, (xpByHouse.get(houseId) ?? 0) + xp);
    }
  }
  if (xpByHouse.size === 0) {
    return state;
  }

  let agents = state.agents;
  let houseModifiers = state.houseModifiers;
  const offers: DraftOffer[] = [];
  const houseProgress = state.houseProgress.map((progress) => {
    const awardedXp = xpByHouse.get(progress.houseId) ?? 0;
    if (awardedXp === 0) {
      return progress;
    }
    const xp = progress.xp + awardedXp;
    const level = levelForXp(xp);
    const updated = { ...progress, xp, level };
    if (level === progress.level) {
      return updated;
    }
    const modifiers = resolveModifiers(
      CARD_DEFINITIONS,
      updated.cards,
      level - 1,
      baseEffectsForHouse(state, progress.houseId),
    );
    agents = healForEffectiveMaxHpIncrease(
      { ...state, agents },
      progress.houseId,
      progress.cards,
      progress.level,
      updated.cards,
      level,
    );
    houseModifiers = replaceModifiers(
      { ...state, houseModifiers },
      progress.houseId,
      modifiers,
    );
    let reservedCards = [...updated.cards];
    for (
      let reachedLevel = progress.level + 1;
      reachedLevel <= level;
      reachedLevel += 1
    ) {
      const offer = generateOffer(
        CARD_DEFINITIONS,
        {
          ...updated,
          level: reachedLevel,
          cards: reservedCards,
        },
        rng,
        ownedHeroIdsForHouse(state, progress.houseId),
      );
      offers.push(offer);
      reservedCards = [
        ...reservedCards,
        ...offer.cardIds.flatMap((cardId) => {
          const definition = CARD_DEFINITIONS.find(
            ({ id }) => id === cardId,
          );
          return definition === undefined
            ? []
            : [{ cardId, stacks: definition.maxStacks }];
        }),
      ];
    }
    return updated;
  });

  offers.sort(
    (first, second) =>
      first.houseId.localeCompare(second.houseId) ||
      first.level - second.level,
  );
  if (offers.length === 0) {
    return { ...state, agents, houseProgress, houseModifiers };
  }
  return {
    ...state,
    agents,
    houseProgress,
    houseModifiers,
    phase: "draft",
    phaseBeforeDraft:
      state.phase === "draft"
        ? state.phaseBeforeDraft
        : state.phase,
    pendingDrafts: [...state.pendingDrafts, ...offers],
  };
}

export function chooseDraftCard(
  state: GameState,
  offerId: string,
  cardId: string,
): GameState {
  const offer = state.pendingDrafts[0];
  if (
    state.phase !== "draft" ||
    offer === undefined ||
    offer.id !== offerId ||
    !offer.cardIds.includes(cardId)
  ) {
    return state;
  }
  const card = CARD_DEFINITIONS.find(({ id }) => id === cardId);
  const progressIndex = state.houseProgress.findIndex(
    ({ houseId }) => houseId === offer.houseId,
  );
  const progress = state.houseProgress[progressIndex];
  if (card === undefined || progress === undefined) {
    return state;
  }
  const existing = progress.cards.find(
    (owned) => owned.cardId === cardId,
  );
  if ((existing?.stacks ?? 0) >= card.maxStacks) {
    return state;
  }
  const cards =
    existing === undefined
      ? [...progress.cards, { cardId, stacks: 1 }]
      : progress.cards.map((owned) =>
          owned.cardId === cardId
            ? { ...owned, stacks: owned.stacks + 1 }
            : owned,
        );
  const updatedProgress = { ...progress, cards };
  const modifiers = resolveModifiers(
    CARD_DEFINITIONS,
    cards,
    progress.level - 1,
    baseEffectsForHouse(state, offer.houseId),
  );
  const houseProgress = [...state.houseProgress];
  houseProgress[progressIndex] = updatedProgress;
  const pendingDrafts = state.pendingDrafts.slice(1);
  const grantedSkill = card.effect.grantsSkill;
  const unlockedSkills =
    grantedSkill === undefined ||
    state.unlockedSkills.includes(grantedSkill)
      ? state.unlockedSkills
      : [...state.unlockedSkills, grantedSkill];
  return {
    ...state,
    agents: healForEffectiveMaxHpIncrease(
      state,
      offer.houseId,
      progress.cards,
      progress.level,
      cards,
      progress.level,
    ),
    houseProgress,
    houseModifiers: replaceModifiers(state, offer.houseId, modifiers),
    unlockedSkills,
    pendingDrafts,
    phase:
      pendingDrafts.length > 0
        ? "draft"
        : (state.phaseBeforeDraft ?? "preparation"),
    phaseBeforeDraft:
      pendingDrafts.length > 0 ? state.phaseBeforeDraft : null,
  };
}
