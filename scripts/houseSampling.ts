import {
  HOUSE_IDS,
  type HouseSelection,
} from "../src/content/houseConfig";
import { createRng } from "../src/engine/prng";

export function allHouseTrios(): readonly HouseSelection[] {
  const trios: HouseSelection[] = [];
  for (let first = 0; first < HOUSE_IDS.length - 2; first += 1) {
    for (let second = first + 1; second < HOUSE_IDS.length - 1; second += 1) {
      for (let third = second + 1; third < HOUSE_IDS.length; third += 1) {
        const a = HOUSE_IDS[first];
        const b = HOUSE_IDS[second];
        const c = HOUSE_IDS[third];
        if (a !== undefined && b !== undefined && c !== undefined) {
          trios.push([a, b, c]);
        }
      }
    }
  }
  return trios;
}

export function createHouseSampleOrder(
  seed: number,
): readonly HouseSelection[] {
  const rng = createRng(seed);
  const trios = [...allHouseTrios()];
  for (let index = trios.length - 1; index > 0; index -= 1) {
    const target = rng.int(0, index + 1);
    const current = trios[index];
    const replacement = trios[target];
    if (current !== undefined && replacement !== undefined) {
      trios[index] = replacement;
      trios[target] = current;
    }
  }
  return trios;
}
