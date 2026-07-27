import { WAVE_DEFINITIONS } from "../src/content/waveConfig";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import type {
  HouseOption,
  PickMode,
  ShopMode,
} from "./balanceOptions";
import type { RunSample } from "./balanceTypes";

import {
  combatDiagnosticTable,
  waveTable,
} from "./balanceCombatReport";
import {
  houseTable,
  legacyObservationTable,
  shopDiagnosticTable,
  shopTable,
  skillTable,
} from "./balanceEconomyReport";
import {
  progressionTable,
  rarityTable,
} from "./balanceProgressionReport";
import {
  displayMedian,
  median,
  rate,
  table,
} from "./balanceReportFormat";

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

export function formatBalanceReport(
  samples: readonly RunSample[],
  maxTicks: number,
  pickMode: PickMode,
  shopMode: ShopMode,
  houseOption: HouseOption,
): string {
  const houseMode =
    houseOption.kind === "random" ? "random-all-20" : houseOption.label;
  return [
    `Balance harness: seeds=${samples.length}, start=${BALANCE_CONFIG.DEFAULT_SEED}, ` +
      `miracles=none, skills=auto, picks=${pickMode}, shop=${shopMode}, houses=${houseMode}, maxTicks=${maxTicks}`,
    outcomeTable(samples),
    endStateTable(samples),
    waveTable(samples),
    combatDiagnosticTable(samples),
    progressionTable(samples),
    rarityTable(samples),
    legacyObservationTable(samples),
    skillTable(samples),
    shopTable(samples),
    shopDiagnosticTable(samples),
    houseTable(samples),
  ].join("\n");
}

export function printBalanceReport(
  samples: readonly RunSample[],
  maxTicks: number,
  pickMode: PickMode,
  shopMode: ShopMode,
  houseOption: HouseOption,
): void {
  console.log(
    formatBalanceReport(samples, maxTicks, pickMode, shopMode, houseOption),
  );
}
