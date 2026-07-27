import type { Rng } from "../content/random";
import type {
  CardDefinition,
  DraftOffer,
  HouseProgress,
  OwnedCard,
} from "./progression.types";

export function eligibleCards(
  allCards: readonly CardDefinition[],
  houseId: string,
  owned: readonly OwnedCard[],
): CardDefinition[] {
  const stacksById = new Map(
    owned.map(({ cardId, stacks }) => [cardId, stacks]),
  );
  return allCards.filter((card) => {
    const availableKind =
      card.kind === "common" ||
      card.kind === "divine" ||
      (card.kind === "house" && card.houseId === houseId);
    return (
      availableKind &&
      (stacksById.get(card.id) ?? 0) < card.maxStacks
    );
  });
}

function drawOne<T>(items: T[], rng: Rng): T | undefined {
  if (items.length === 0) {
    return undefined;
  }
  const index = rng.int(0, items.length);
  const [item] = items.splice(index, 1);
  return item;
}

export function generateOffer(
  allCards: readonly CardDefinition[],
  progress: HouseProgress,
  rng: Rng,
): DraftOffer {
  const remaining = eligibleCards(
    allCards,
    progress.houseId,
    progress.cards,
  ).sort((first, second) => first.id.localeCompare(second.id));
  const cardIds: string[] = [];
  const houseCards = remaining.filter(({ kind }) => kind === "house");
  const houseCard = drawOne(houseCards, rng);
  if (houseCard !== undefined) {
    cardIds.push(houseCard.id);
    remaining.splice(
      remaining.findIndex(({ id }) => id === houseCard.id),
      1,
    );
  }
  while (cardIds.length < 3 && remaining.length > 0) {
    const card = drawOne(remaining, rng);
    if (card !== undefined) {
      cardIds.push(card.id);
    }
  }
  return {
    id: `draft_${progress.houseId}_${progress.level}`,
    houseId: progress.houseId,
    level: progress.level,
    cardIds,
  };
}
