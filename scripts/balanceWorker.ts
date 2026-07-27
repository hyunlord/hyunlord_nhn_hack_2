import {
  parentPort,
  workerData,
} from "node:worker_threads";
import {
  runBalanceBlock,
  type BalanceWorkBlock,
} from "./balanceRunner";

const block: BalanceWorkBlock = workerData;
const samples = runBalanceBlock(block);

parentPort?.postMessage(samples);
