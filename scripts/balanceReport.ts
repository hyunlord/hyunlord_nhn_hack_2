import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { WAVE_DEFINITIONS } from "../src/content/waveConfig";
import type { RunSample } from "./balanceHarness";

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

export function printBalanceReport(
  samples: readonly RunSample[],
  maxTicks: number,
): void {
  console.log(
    `Balance harness: seeds=${samples.length}, start=${BALANCE_CONFIG.DEFAULT_SEED}, ` +
      `miracles=none, maxTicks=${maxTicks}`,
  );
  console.log(outcomeTable(samples));
  console.log(endStateTable(samples));
  console.log(waveTable(samples));
}
