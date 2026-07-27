import { CARD_DEFINITIONS } from "../src/content/cardConfig";
import type { CardRarity } from "../src/progression/progression.types";
import {
  average,
  displayAverage,
  rate,
  table,
} from "./balanceReportFormat";
import type { RunSample } from "./balanceTypes";

const CARD_RARITIES = [
  "common",
  "rare",
  "legendary",
] as const satisfies readonly CardRarity[];

export function progressionTable(samples: readonly RunSample[]): string {
  const picks = new Map<string, number>();
  for (const sample of samples) {
    for (const cardId of sample.pickedCardIds) {
      picks.set(cardId, (picks.get(cardId) ?? 0) + 1);
    }
  }
  const mostPicked = [...picks.entries()].sort(
    ([firstId, firstCount], [secondId, secondCount]) =>
      secondCount - firstCount || firstId.localeCompare(secondId),
  )[0];
  const rows = [
    [
      "Drafts per run",
      displayAverage(average(samples.map(({ draftCount }) => draftCount))),
    ],
    [
      "Final level per house",
      displayAverage(
        average(samples.flatMap(({ finalLevels }) => finalLevels)),
      ),
    ],
    [
      "Final hero level",
      displayAverage(
        average(samples.flatMap(({ finalHeroLevels }) => finalHeroLevels)),
      ),
    ],
    [
      "Skill casts per run",
      displayAverage(average(samples.map(({ skillCasts }) => skillCasts))),
    ],
    [
      "Houses ending at level 1",
      `${samples.flatMap(({ finalLevels }) => finalLevels).filter((level) => level === 1).length}/${samples.length * 3} (${rate(
        samples
          .flatMap(({ finalLevels }) => finalLevels)
          .filter((level) => level === 1).length,
        samples.length * 3,
      )})`,
    ],
    [
      "Runs with a level-1 house",
      `${samples.filter(({ finalLevels }) => finalLevels.some((level) => level === 1)).length}/${samples.length} (${rate(
        samples.filter(({ finalLevels }) =>
          finalLevels.some((level) => level === 1),
        ).length,
        samples.length,
      )})`,
    ],
    [
      "Most-picked card",
      mostPicked === undefined
        ? "—"
        : `${mostPicked[0]} (${mostPicked[1]})`,
    ],
  ];
  return table(["Progression metric", "Value"], rows);
}

export function rarityTable(samples: readonly RunSample[]): string {
  const rarityById = new Map(
    CARD_DEFINITIONS.map(({ id, rarity }) => [id, rarity]),
  );
  const offered = samples.flatMap(({ offeredCardIds }) => offeredCardIds);
  const picked = samples.flatMap(({ pickedCardIds }) => pickedCardIds);
  return table(
    ["Rarity", "Offered", "Offered rate", "Picked", "Picked rate"],
    CARD_RARITIES.map((rarity) => {
      const offeredCount = offered.filter(
        (id) => rarityById.get(id) === rarity,
      ).length;
      const pickedCount = picked.filter(
        (id) => rarityById.get(id) === rarity,
      ).length;
      return [
        rarity,
        `${offeredCount}`,
        rate(offeredCount, offered.length),
        `${pickedCount}`,
        rate(pickedCount, picked.length),
      ];
    }),
  );
}
