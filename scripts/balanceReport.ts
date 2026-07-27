import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { WAVE_DEFINITIONS } from "../src/content/waveConfig";
import type {
  HouseOption,
  PickMode,
  RunSample,
  ShopMode,
} from "./balanceHarness";

function median(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  if (upper === undefined) {
    return null;
  }
  if (sorted.length % 2 === 1) {
    return upper;
  }
  const lower = sorted[middle - 1];
  return lower === undefined ? null : (lower + upper) / 2;
}

function displayMedian(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function rate(count: number, total: number): string {
  return total === 0 ? "—" : `${((count / total) * 100).toFixed(1)}%`;
}

function average(values: readonly number[]): number | null {
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function displayAverage(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

function table(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const widths = headers.map((header, index) =>
    Math.max(
      header.length,
      ...rows.map((row) => row[index]?.length ?? 0),
    ),
  );
  const render = (row: readonly string[]) =>
    row
      .map((cell, index) => cell.padEnd(widths[index] ?? 0))
      .join(" | ");
  return [
    render(headers),
    widths.map((width) => "-".repeat(width)).join("-|-"),
    ...rows.map(render),
  ].join("\n");
}

function outcomeTable(samples: readonly RunSample[]): string {
  const rows = WAVE_DEFINITIONS.map((_, waveIndex) => {
    const runs = samples.filter(
      ({ outcome }) =>
        outcome.kind === "defeat" && outcome.waveIndex === waveIndex,
    );
    return [
      `Defeat W${waveIndex + 1}`,
      `${runs.length}`,
      rate(runs.length, samples.length),
      displayMedian(median(runs.map(({ endTick }) => endTick))),
    ];
  });
  const victories = samples.filter(({ outcome }) => outcome.kind === "victory");
  rows.push([
    "Victory",
    `${victories.length}`,
    rate(victories.length, samples.length),
    displayMedian(median(victories.map(({ endTick }) => endTick))),
  ]);
  return table(["Outcome", "Runs", "Rate", "Median end tick"], rows);
}

function endStateTable(samples: readonly RunSample[]): string {
  return table(
    ["Metric", "Median"],
    [
      [
        "Surviving agents",
        displayMedian(median(samples.map(({ survivingAgents }) => survivingAgents))),
      ],
      [
        `Hall HP remaining (sum; max ${BALANCE_CONFIG.HALL_HP * 3})`,
        displayMedian(median(samples.map(({ hallHpRemaining }) => hallHpRemaining))),
      ],
      [
        "Terminal tick",
        displayMedian(median(samples.map(({ endTick }) => endTick))),
      ],
    ],
  );
}

function waveTable(samples: readonly RunSample[]): string {
  return table(
    [
      "Wave",
      "Label",
      "Reached",
      "Cleared",
      "Clear rate",
      "Median clear ticks (clears)",
      "Median creature kills (reached)",
    ],
    WAVE_DEFINITIONS.map((definition) => {
      const reached = samples.filter(
        ({ waves }) => waves[definition.index]?.reached === true,
      );
      const cleared = reached.flatMap(({ waves }) => {
        const clear = waves[definition.index]?.clearTicks;
        return clear === null || clear === undefined ? [] : [clear];
      });
      return [
        `${definition.index + 1}`,
        definition.label,
        `${reached.length}`,
        `${cleared.length}`,
        rate(cleared.length, reached.length),
        displayMedian(median(cleared)),
        displayMedian(
          median(
            reached.map(
              ({ waves }) =>
                waves[definition.index]?.creatureKills ?? 0,
            ),
          ),
        ),
      ];
    }),
  );
}

function progressionTable(samples: readonly RunSample[]): string {
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

function shopTable(samples: readonly RunSample[]): string {
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

function shopDiagnosticTable(samples: readonly RunSample[]): string {
  const itemIds = Object.keys(
    samples[0]?.shopDiagnostics ?? {},
  ) as (keyof RunSample["shopDiagnostics"])[];
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
        (sum, sample) =>
          sum + sample.shopDiagnostics[itemId].attempted,
        0,
      )}`,
      `${samples.reduce(
        (sum, sample) =>
          sum + sample.shopDiagnostics[itemId].succeeded,
        0,
      )}`,
      `${samples.reduce(
        (sum, sample) =>
          sum + sample.shopDiagnostics[itemId].unaffordable,
        0,
      )}`,
      `${samples.reduce(
        (sum, sample) =>
          sum + sample.shopDiagnostics[itemId].domainUnavailable,
        0,
      )}`,
      `${samples.reduce(
        (sum, sample) =>
          sum + sample.shopDiagnostics[itemId].placementFailed,
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

function houseTable(samples: readonly RunSample[]): string {
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
          victoryRate > 70 ? "OVER 70%" : "",
        ];
      }),
  );
}

export function printBalanceReport(
  samples: readonly RunSample[],
  maxTicks: number,
  pickMode: PickMode,
  shopMode: ShopMode,
  houseOption: HouseOption,
): void {
  const houseMode =
    houseOption.kind === "random" ? "random-all-20" : houseOption.label;
  console.log(
    `Balance harness: seeds=${samples.length}, start=${BALANCE_CONFIG.DEFAULT_SEED}, ` +
      `miracles=none, picks=${pickMode}, shop=${shopMode}, houses=${houseMode}, maxTicks=${maxTicks}`,
  );
  console.log(outcomeTable(samples));
  console.log(endStateTable(samples));
  console.log(waveTable(samples));
  console.log(progressionTable(samples));
  console.log(shopTable(samples));
  console.log(shopDiagnosticTable(samples));
  console.log(houseTable(samples));
}
