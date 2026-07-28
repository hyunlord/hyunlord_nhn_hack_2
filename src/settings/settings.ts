import type { StorageLike } from "../meta/persistence";
import type { Language } from "../content/locale";

export const SETTINGS_STORAGE_KEY = "hyunlord.settings.v1";
export const SETTINGS_STATE_VERSION = 1 as const;

export const SIMULATION_SPEEDS = [0.5, 1, 2] as const;
export type SimulationSpeed = (typeof SIMULATION_SPEEDS)[number];

export interface SettingsState {
  readonly version: typeof SETTINGS_STATE_VERSION;
  readonly language: Language;
  readonly simulationSpeed: SimulationSpeed;
  readonly screenShake: boolean;
  readonly masterVolume: number;
}

export type SettingsUpdate = Partial<
  Pick<SettingsState, "language" | "simulationSpeed" | "screenShake">
>;

export function createDefaultSettings(): SettingsState {
  return {
    version: SETTINGS_STATE_VERSION,
    language: "ko",
    simulationSpeed: 1,
    screenShake: true,
    masterVolume: 0,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLanguage(value: unknown): value is Language {
  return value === "ko" || value === "en";
}

function isSimulationSpeed(value: unknown): value is SimulationSpeed {
  return SIMULATION_SPEEDS.some((speed) => speed === value);
}

function parseSettings(value: unknown): SettingsState | null {
  if (!isRecord(value)) {
    return null;
  }

  const version = value["version"];
  const language = value["language"];
  const simulationSpeed = value["simulationSpeed"];
  const screenShake = value["screenShake"];
  const masterVolume = value["masterVolume"];

  if (
    version !== SETTINGS_STATE_VERSION ||
    !isLanguage(language) ||
    !isSimulationSpeed(simulationSpeed) ||
    typeof screenShake !== "boolean" ||
    masterVolume !== 0
  ) {
    return null;
  }

  return {
    version: SETTINGS_STATE_VERSION,
    language,
    simulationSpeed,
    screenShake,
    masterVolume,
  };
}

export function loadSettings(
  storage: StorageLike,
  key = SETTINGS_STORAGE_KEY,
): SettingsState {
  const raw = storage.getItem(key);
  if (raw === null) {
    return createDefaultSettings();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return parseSettings(parsed) ?? createDefaultSettings();
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return createDefaultSettings();
    }
    throw error;
  }
}

export function saveSettings(
  storage: StorageLike,
  state: SettingsState,
  key = SETTINGS_STORAGE_KEY,
): void {
  storage.setItem(key, JSON.stringify(state));
}

export function updateSettings(
  current: SettingsState,
  update: SettingsUpdate,
): SettingsState {
  return {
    ...current,
    ...update,
    version: SETTINGS_STATE_VERSION,
    masterVolume: 0,
  };
}
