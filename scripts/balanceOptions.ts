import type {
  HouseId,
  HouseSelection,
} from "../src/content/houseConfig";

const DEFAULT_RUN_COUNT = 200;

export type PickMode = "first" | "random";
export type ShopMode = "auto" | "none";
export type HouseOption =
  | {
      readonly kind: "fixed";
      readonly houseIds: HouseSelection;
      readonly label: string;
    }
  | { readonly kind: "random" };
export type HarnessOptions = {
  readonly runCount: number;
  readonly pickMode: PickMode;
  readonly shopMode: ShopMode;
  readonly houseOption: HouseOption;
};

export class HarnessUsageError extends Error {
  readonly exitCode = 2;

  constructor(readonly argument: string) {
    super(
      `Invalid balance arguments "${argument}". Expected a positive run count and --pick=first|random, --shop=auto|none, --houses=abc|random.`,
    );
    this.name = "HarnessUsageError";
  }
}

const HOUSE_LETTERS: Readonly<Record<string, HouseId>> = {
  a: "house_a",
  b: "house_b",
  c: "house_c",
  d: "house_d",
  e: "house_e",
  f: "house_f",
};

export function parseRunCount(args: readonly string[]): number {
  const positional = args.filter((argument) => !argument.startsWith("--"));
  if (positional.length === 0) {
    return DEFAULT_RUN_COUNT;
  }
  const argument = positional.join(" ");
  if (
    positional.length !== 1 ||
    !/^[1-9]\d*$/.test(argument) ||
    !Number.isSafeInteger(Number(argument))
  ) {
    throw new HarnessUsageError(argument);
  }
  return Number(argument);
}

function parseHouseOption(argument: string | undefined): HouseOption {
  const value = argument?.slice("--houses=".length) ?? "abc";
  if (value === "random") {
    return { kind: "random" };
  }
  const letters = value.includes(",") ? value.split(",") : [...value];
  const ids = letters.map((letter) => HOUSE_LETTERS[letter]);
  if (
    letters.length !== 3 ||
    ids.some((id) => id === undefined) ||
    new Set(ids).size !== 3
  ) {
    throw new HarnessUsageError(argument ?? value);
  }
  const [first, second, third] = ids;
  if (first === undefined || second === undefined || third === undefined) {
    throw new HarnessUsageError(value);
  }
  return {
    kind: "fixed",
    houseIds: [first, second, third],
    label: letters.join(""),
  };
}

export function parseHarnessOptions(
  args: readonly string[],
): HarnessOptions {
  const pickArguments = args.filter((argument) =>
    argument.startsWith("--pick="),
  );
  const shopArguments = args.filter((argument) =>
    argument.startsWith("--shop="),
  );
  const houseArguments = args.filter((argument) =>
    argument.startsWith("--houses="),
  );
  const unknownFlags = args.filter(
    (argument) =>
      argument.startsWith("--") &&
      !argument.startsWith("--pick=") &&
      !argument.startsWith("--shop=") &&
      !argument.startsWith("--houses="),
  );
  const pickMode = pickArguments[0]?.slice("--pick=".length) ?? "first";
  const shopMode = shopArguments[0]?.slice("--shop=".length) ?? "auto";
  if (
    unknownFlags.length > 0 ||
    pickArguments.length > 1 ||
    shopArguments.length > 1 ||
    houseArguments.length > 1 ||
    (pickMode !== "first" && pickMode !== "random") ||
    (shopMode !== "auto" && shopMode !== "none")
  ) {
    throw new HarnessUsageError(args.join(" "));
  }
  return {
    runCount: parseRunCount(args),
    pickMode,
    shopMode,
    houseOption: parseHouseOption(houseArguments[0]),
  };
}
