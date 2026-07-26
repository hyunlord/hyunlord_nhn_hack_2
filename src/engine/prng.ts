export interface Rng {
  next(): number;
  range(min: number, max: number): number;
  int(minInclusive: number, maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  }

  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(minInclusive, maxExclusive) {
      return Math.floor(minInclusive + next() * (maxExclusive - minInclusive));
    },
    pick<T>(items: readonly T[]) {
      const item = items[this.int(0, items.length)];
      if (item === undefined) {
        throw new RangeError("Cannot pick from an empty array.");
      }
      return item;
    },
  };
}
