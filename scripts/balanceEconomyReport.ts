import { SHOP_CATALOG } from "../src/build/shop";
import { INVESTMENT_TRACKS } from "../src/content/investmentConfig";
import { DIVINE_SKILL_DEFINITIONS } from "../src/content/skillConfig";
import { investmentCost } from "../src/meta/investments";
import {
  average,
  displayAverage,
  displayMedian,
  median,
  rate,
  table,
} from "./balanceReportFormat";
import type { RunSample } from "./balanceTypes";

function globalInvestmentMaxCost(): number {
  return INVESTMENT_TRACKS.filter(({ scope }) => scope === "global").reduce(
    (total, track) =>
      total +
      Array.from({ length: track.maxRank }, (_, rank) =>
        investmentCost(track, rank),
      ).reduce((trackTotal, cost) => trackTotal + cost, 0),
    0,
  );
}

export function legacyObservationTable(
  samples: readonly RunSample[],
): string {
  const maxCost = globalInvestmentMaxCost();
  const observedAverage = average(
    samples.map(({ legacyEarned }) => legacyEarned),
  );
  const observedRuns =
    observedAverage === null || observedAverage <= 0
      ? null
      : Math.ceil(maxCost / observedAverage);
  return table(
    ["Legacy investment observation", "Value"],
    [
      ["Total cost to max global investments", `${maxCost}`],
      [
        "Observed Legacy per run (average; sample only)",
        displayAverage(observedAverage),
      ],
      [
        "Observed runs to max globals (average; observation only)",
        observedRuns === null ? "—" : `${observedRuns}`,
      ],
    ],
  );
}

export function skillTable(samples: readonly RunSample[]): string {
  return table(
    ["Divine skill", "Runs acquired", "Acquisition rate"],
    Object.values(DIVINE_SKILL_DEFINITIONS).map(({ id, name }) => {
      const acquired = samples.filter(({ acquiredSkillIds }) =>
        acquiredSkillIds.includes(id),
      ).length;
      return [name, `${acquired}`, rate(acquired, samples.length)];
    }),
  );
}

export function shopTable(samples: readonly RunSample[]): string {
  return table(
    ["Shop metric", "Average", "Median"],
    [
      [
        "Towers built per run",
        displayAverage(average(samples.map(({ towersBuilt }) => towersBuilt))),
        displayMedian(median(samples.map(({ towersBuilt }) => towersBuilt))),
      ],
      [
        "Tribute unspent after final shop",
        displayAverage(
          average(samples.map(({ tributeUnspent }) => tributeUnspent)),
        ),
        displayMedian(
          median(samples.map(({ tributeUnspent }) => tributeUnspent)),
        ),
      ],
      [
        "Hero deaths per run",
        displayAverage(average(samples.map(({ heroDeaths }) => heroDeaths))),
        displayMedian(median(samples.map(({ heroDeaths }) => heroDeaths))),
      ],
    ],
  );
}

export function shopDiagnosticTable(samples: readonly RunSample[]): string {
  const itemIds = SHOP_CATALOG.map(({ id }) => id);
  return table(
    [
      "Shop item",
      "Attempts",
      "Success",
      "Unaffordable",
      "Unavailable",
      "Placement failed",
    ],
    itemIds.map((itemId) => [
      itemId,
      `${samples.reduce(
        (sum, sample) => sum + sample.shopDiagnostics[itemId].attempted,
        0,
      )}`,
      `${samples.reduce(
        (sum, sample) => sum + sample.shopDiagnostics[itemId].succeeded,
        0,
      )}`,
      `${samples.reduce(
        (sum, sample) => sum + sample.shopDiagnostics[itemId].unaffordable,
        0,
      )}`,
      `${samples.reduce(
        (sum, sample) =>
          sum + sample.shopDiagnostics[itemId].domainUnavailable,
        0,
      )}`,
      `${samples.reduce(
        (sum, sample) => sum + sample.shopDiagnostics[itemId].placementFailed,
        0,
      )}`,
    ]),
  );
}

function trioLabel(sample: RunSample): string {
  return sample.selectedHouseIds
    .map((houseId) => houseId.slice("house_".length))
    .join("");
}

export function houseTable(samples: readonly RunSample[]): string {
  const grouped = new Map<string, RunSample[]>();
  for (const sample of samples) {
    const label = trioLabel(sample);
    grouped.set(label, [...(grouped.get(label) ?? []), sample]);
  }
  return table(
    ["Trio", "Runs", "Victory rate", "Median Legacy", "Balance flag"],
    [...grouped.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([label, trioSamples]) => {
        const victories = trioSamples.filter(
          ({ outcome }) => outcome.kind === "victory",
        ).length;
        const victoryRate = (victories / trioSamples.length) * 100;
        return [
          label,
          `${trioSamples.length}`,
          rate(victories, trioSamples.length),
          displayMedian(
            median(trioSamples.map(({ legacyEarned }) => legacyEarned)),
          ),
          victoryRate > 75
            ? "OVER 75%"
            : victoryRate < 10
              ? "UNDER 10%"
              : "",
        ];
      }),
  );
}
