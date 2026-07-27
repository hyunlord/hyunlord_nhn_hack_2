import type { Rng } from "../content/random";
import { RARITY_WEIGHTS } from "../content/cardConfig";
import type {
  CardDefinition,
  CardRarity,
  DraftOffer,
  HouseProgress,
  OwnedCard,
} from "./progression.types";

const RARITY_ORDER = ["common", "rare", "legendary"] as const;

export function eligibleCards(
  allCards: readonly CardDefinition[],
  houseId: string,
  owned: readonly OwnedCard[],
  ownedHeroIds: readonly string[] = [],
): CardDefinition[] {
  const stacksById = new Map(
    owned.map(({ cardId, stacks }) => [cardId, stacks]),
  );
  return allCards.filter((card) => {
    const availableKind =
      card.kind === "common" ||
      card.kind === "divine" ||
      (card.kind === "house" && card.houseId === houseId) ||
      (
        card.kind === "hero" &&
        (
          (card.houseId === undefined && card.heroId === undefined) ||
          (
            card.houseId === houseId &&
            card.heroId !== undefined &&
            ownedHeroIds.includes(card.heroId)
          )
        )
      );
    return (
      availableKind &&
      (stacksById.get(card.id) ?? 0) < card.maxStacks
    );
  });
}

export function rollRarity(
  rng: Rng,
  allowed: readonly CardRarity[] = RARITY_ORDER,
): CardRarity {
  const allowedSet = new Set(allowed);
  const total = RARITY_ORDER.reduce(
    (sum, rarity) =>
      sum + (allowedSet.has(rarity) ? RARITY_WEIGHTS[rarity] : 0),
    0,
  );
  if (total <= 0) {
    throw new RangeError("At least one card rarity must be allowed.");
  }
  const roll = rng.next() * total;
  let cursor = 0;
  for (const rarity of RARITY_ORDER) {
    if (!allowedSet.has(rarity)) {
      continue;
    }
    cursor += RARITY_WEIGHTS[rarity];
    if (roll < cursor) {
      return rarity;
    }
  }
  return allowed[allowed.length - 1] ?? "common";
}

function drawOne<T>(items: T[], rng: Rng): T | undefined {
  if (items.length === 0) {
    return undefined;
  }
  const index = rng.int(0, items.length);
  const [item] = items.splice(index, 1);
  return item;
}

export function rarityFallbackOrder(
  rarity: CardRarity,
): readonly CardRarity[] {
  switch (rarity) {
    case "common":
      return ["common"];
    case "rare":
      return ["rare", "common"];
    case "legendary":
      return ["legendary", "rare", "common"];
  }
}

function drawForRarity(
  remaining: CardDefinition[],
  rarity: CardRarity,
  rng: Rng,
): CardDefinition | undefined {
  for (const fallback of rarityFallbackOrder(rarity)) {
    const candidates = remaining.filter(
      (card) => card.rarity === fallback,
    );
    const picked = drawOne(candidates, rng);
    if (picked === undefined) {
      continue;
    }
    const index = remaining.findIndex(({ id }) => id === picked.id);
    if (index >= 0) {
      remaining.splice(index, 1);
    }
    return picked;
  }
  return undefined;
}

function chooseHouseGuarantee(
  remaining: CardDefinition[],
  rng: Rng,
): CardDefinition | undefined {
  const houseCards = remaining.filter(({ kind }) => kind === "house");
  const rarity = rollRarity(
    rng,
    RARITY_ORDER.filter((candidate) =>
      houseCards.some((card) => card.rarity === candidate),
    ),
  );
  const candidates = houseCards.filter((card) => card.rarity === rarity);
  const picked = drawOne(candidates, rng);
  if (picked === undefined) {
    return undefined;
  }
  const index = remaining.findIndex(({ id }) => id === picked.id);
  if (index >= 0) {
    remaining.splice(index, 1);
  }
  return picked;
}

export function generateOffer(
  allCards: readonly CardDefinition[],
  progress: HouseProgress,
  rng: Rng,
  ownedHeroIds: readonly string[] = [],
): DraftOffer {
  const remaining = eligibleCards(
    allCards,
    progress.houseId,
    progress.cards,
    ownedHeroIds,
  ).sort((first, second) => first.id.localeCompare(second.id));
  const originalHouseEligible = remaining.some(
    ({ kind }) => kind === "house",
  );
  const availableRarities = RARITY_ORDER.filter((rarity) =>
    remaining.some((card) => card.rarity === rarity),
  );
  const rolls = [
    rollRarity(rng),
    rollRarity(rng),
    rollRarity(rng),
  ];
  if (
    rolls[0] === rolls[1] &&
    rolls[1] === rolls[2] &&
    availableRarities.some((rarity) => rarity !== rolls[0])
  ) {
    const alternatives = availableRarities.filter(
      (rarity) => rarity !== rolls[0],
    );
    rolls[2] = rollRarity(rng, alternatives);
  }

  const selected: CardDefinition[] = [];
  for (const rarity of rolls) {
    const card = drawForRarity(remaining, rarity, rng);
    if (card !== undefined) {
      selected.push(card);
    }
  }
  if (
    originalHouseEligible &&
    !selected.some(({ kind }) => kind === "house")
  ) {
    const houseCard = chooseHouseGuarantee(remaining, rng);
    if (houseCard !== undefined) {
      if (selected.length >= 3) {
        const matchingRarityIndex = selected.findIndex(
          ({ rarity }) => rarity === houseCard.rarity,
        );
        const replacementIndex =
          matchingRarityIndex >= 0 ? matchingRarityIndex : 0;
        const [replaced] = selected.splice(replacementIndex, 1);
        if (replaced !== undefined) {
          remaining.push(replaced);
          remaining.sort((first, second) => first.id.localeCompare(second.id));
        }
      }
      selected.unshift(houseCard);
    }
  }
  return {
    id: `draft_${progress.houseId}_${progress.level}`,
    houseId: progress.houseId,
    level: progress.level,
    cardIds: selected.slice(0, 3).map(({ id }) => id),
  };
}
