import { Worker } from "node:worker_threads";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import type { HouseSelection } from "../src/content/houseConfig";
import { runSimulation } from "./balanceSimulation";
import type {
  HarnessOptions,
  PickMode,
  ShopMode,
} from "./balanceOptions";
import { createHouseSampleOrder } from "./houseSampling";
import type { RunSample } from "./balanceTypes";

export type BalanceWorkBlock = {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly pickMode: PickMode;
  readonly shopMode: ShopMode;
  readonly sampledTrios: readonly HouseSelection[];
};

function triosForOptions(
  options: HarnessOptions,
): readonly HouseSelection[] {
  return options.houseOption.kind === "random"
    ? createHouseSampleOrder(BALANCE_CONFIG.DEFAULT_SEED ^ 0x51a7c0de)
    : [options.houseOption.houseIds];
}

export function runBalanceBlock(block: BalanceWorkBlock): RunSample[] {
  return Array.from(
    { length: block.endIndex - block.startIndex },
    (_, offset) => {
      const index = block.startIndex + offset;
      return runSimulation(
        (BALANCE_CONFIG.DEFAULT_SEED + index) >>> 0,
        block.pickMode,
        block.shopMode,
        block.sampledTrios[index % block.sampledTrios.length] ??
          block.sampledTrios[0] ??
          ["house_a", "house_b", "house_c"],
      );
    },
  );
}

function createWorkBlocks(options: HarnessOptions): BalanceWorkBlock[] {
  const workerCount = Math.min(options.workerCount, options.runCount);
  const blockSize = Math.floor(options.runCount / workerCount);
  const remainder = options.runCount % workerCount;
  const sampledTrios = triosForOptions(options);
  let startIndex = 0;
  return Array.from({ length: workerCount }, (_, workerIndex) => {
    const length = blockSize + (workerIndex < remainder ? 1 : 0);
    const block = {
      startIndex,
      endIndex: startIndex + length,
      pickMode: options.pickMode,
      shopMode: options.shopMode,
      sampledTrios,
    } satisfies BalanceWorkBlock;
    startIndex += length;
    return block;
  });
}

export function runBalanceSerial(options: HarnessOptions): RunSample[] {
  return createWorkBlocks({ ...options, workerCount: 1 }).flatMap(
    runBalanceBlock,
  );
}

function runWorker(block: BalanceWorkBlock): Promise<RunSample[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./balanceWorker.mjs", import.meta.url),
      { workerData: block },
    );
    worker.once("message", (samples: RunSample[]) => {
      resolve(samples);
    });
    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Balance worker exited with code ${code}.`));
      }
    });
  });
}

export async function runBalanceParallel(
  options: HarnessOptions,
): Promise<RunSample[]> {
  if (options.workerCount === 1 || options.runCount === 1) {
    return runBalanceSerial(options);
  }
  const completed = await Promise.all(
    createWorkBlocks(options).map(runWorker),
  );
  return completed
    .flat()
    .sort((first, second) => first.seed - second.seed);
}
