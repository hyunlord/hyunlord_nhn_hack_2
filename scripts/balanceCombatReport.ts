import { UNIT_CLASS_IDS, UNIT_CLASSES } from "../src/content/unitClassConfig";
import { WAVE_DEFINITIONS } from "../src/content/waveConfig";
import {
  displayMedian,
  median,
  rate,
  table,
} from "./balanceReportFormat";
import type { RunSample } from "./balanceTypes";

export function waveTable(samples: readonly RunSample[]): string {
  return table(
    [
      "Wave",
      "Label",
      "Reached",
      "Cleared",
      "Clear rate",
      "Median agents start",
      "Median agents end",
      "Median kills / spawned",
      "Median clear ticks",
      "Runs with hall damage",
      "Median hall damage",
      "Median mage-only ticks",
    ],
    WAVE_DEFINITIONS.map((definition) => {
      const reached = samples.filter(
        ({ waves }) => waves[definition.index]?.reached === true,
      );
      const cleared = reached.flatMap(({ waves }) => {
        const clear = waves[definition.index]?.clearTicks;
        return clear === null || clear === undefined ? [] : [clear];
      });
      const withHallDamage = reached.filter(
        ({ waves }) => (waves[definition.index]?.hallDamage ?? 0) > 0,
      );
      return [
        `${definition.index + 1}`,
        definition.label,
        `${reached.length}`,
        `${cleared.length}`,
        rate(cleared.length, reached.length),
        displayMedian(
          median(
            reached.flatMap(({ waves }) => {
              const value = waves[definition.index]?.startAgents;
              return value === null || value === undefined ? [] : [value];
            }),
          ),
        ),
        displayMedian(
          median(
            reached.flatMap(({ waves }) => {
              const value = waves[definition.index]?.endAgents;
              return value === null || value === undefined ? [] : [value];
            }),
          ),
        ),
        `${displayMedian(
          median(
            reached.map(
              ({ waves }) => waves[definition.index]?.creatureKills ?? 0,
            ),
          ),
        )} / ${displayMedian(
          median(
            reached.map(
              ({ waves }) => waves[definition.index]?.creatureSpawns ?? 0,
            ),
          ),
        )}`,
        displayMedian(median(cleared)),
        rate(withHallDamage.length, reached.length),
        displayMedian(
          median(
            reached.map(({ waves }) => waves[definition.index]?.hallDamage ?? 0),
          ),
        ),
        displayMedian(
          median(
            reached.map(
              ({ waves }) => waves[definition.index]?.mageOnlyTicks ?? 0,
            ),
          ),
        ),
      ];
    }),
  );
}

export function combatDiagnosticTable(
  samples: readonly RunSample[],
): string {
  const totalDeaths = samples.reduce(
    (sum, sample) =>
      sum +
      UNIT_CLASS_IDS.reduce(
        (classSum, unitClass) => classSum + sample.classDeaths[unitClass],
        0,
      ),
    0,
  );
  return table(
    ["Combat diagnostic", "Value"],
    [
      [
        "Divine power spent per run (median)",
        displayMedian(
          median(samples.map(({ divinePowerSpent }) => divinePowerSpent)),
        ),
      ],
      ...UNIT_CLASS_IDS.map((unitClass) => {
        const deaths = samples.reduce(
          (sum, sample) => sum + sample.classDeaths[unitClass],
          0,
        );
        return [
          `${UNIT_CLASSES[unitClass].name} deaths`,
          `${deaths} (${rate(deaths, totalDeaths)})`,
        ];
      }),
    ],
  );
}
