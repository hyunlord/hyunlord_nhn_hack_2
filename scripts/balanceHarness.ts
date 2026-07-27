import { pathToFileURL } from "node:url";
import { printBalanceReport } from "./balanceReport";
import {
  HarnessUsageError,
  parseHarnessOptions,
} from "./balanceOptions";
import { runBalanceParallel } from "./balanceRunner";
import { MAX_RUN_TICKS } from "./balanceSimulation";

export {
  parseHarnessOptions,
  parseRunCount,
  type HarnessOptions,
  type HouseOption,
  type PickMode,
  type ShopMode,
} from "./balanceOptions";
export {
  chooseDraftCardId,
  runSimulation,
} from "./balanceSimulation";
export type {
  RunOutcome,
  RunSample,
  SimulationObserver,
  WaveSample,
} from "./balanceTypes";

async function main(): Promise<void> {
  const options = parseHarnessOptions(process.argv.slice(2));
  const samples = await runBalanceParallel(options);
  printBalanceReport(
    samples,
    MAX_RUN_TICKS,
    options.pickMode,
    options.shopMode,
    options.houseOption,
  );
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    if (error instanceof HarnessUsageError) {
      console.error(error.message);
      process.exitCode = error.exitCode;
    } else if (error instanceof Error) {
      console.error(error.message);
      process.exitCode = 1;
    } else {
      throw error;
    }
  });
}
