import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultSettings,
  loadSettings,
  saveSettings,
  updateSettings,
} from "../src/settings/settings";

class MemoryStorage {
  private readonly entries = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }
}

test("Given no saved settings, when loading, then Korean defaults and gameplay-safe values are used", () => {
  const storage = new MemoryStorage();

  const settings = loadSettings(storage);

  assert.deepEqual(settings, {
    version: 1,
    language: "ko",
    simulationSpeed: 1,
    screenShake: true,
    masterVolume: 0,
  });
});

test("Given saved settings, when loading, then the versioned settings key is independent from meta", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    "hyunlord.meta.v1",
    JSON.stringify({ version: 2, language: "ko", simulationSpeed: 2 }),
  );
  saveSettings(storage, {
    version: 1,
    language: "en",
    simulationSpeed: 2,
    screenShake: false,
    masterVolume: 0,
  });

  const settings = loadSettings(storage);

  assert.equal(settings.language, "en");
  assert.equal(settings.simulationSpeed, 2);
  assert.equal(settings.screenShake, false);
});

test("Given invalid persisted settings, when loading, then defaults replace unsupported values", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    "hyunlord.settings.v1",
    JSON.stringify({
      version: 1,
      language: "jp",
      simulationSpeed: 3,
      screenShake: "yes",
      masterVolume: 1,
    }),
  );

  assert.deepEqual(loadSettings(storage), createDefaultSettings());
});

test("Given corrupted or version-mismatched settings, when loading, then Korean defaults recover safely", () => {
  const corrupted = new MemoryStorage();
  corrupted.setItem("hyunlord.settings.v1", "{broken-json");
  assert.deepEqual(loadSettings(corrupted), createDefaultSettings());

  const wrongVersion = new MemoryStorage();
  wrongVersion.setItem(
    "hyunlord.settings.v1",
    JSON.stringify({
      version: 2,
      language: "en",
      simulationSpeed: 2,
      screenShake: false,
      masterVolume: 0,
    }),
  );
  assert.deepEqual(loadSettings(wrongVersion), createDefaultSettings());
});

test("Given current settings, when a valid partial update is applied, then only supported settings change", () => {
  const settings = updateSettings(createDefaultSettings(), {
    language: "en",
    simulationSpeed: 0.5,
    screenShake: false,
  });

  assert.deepEqual(settings, {
    version: 1,
    language: "en",
    simulationSpeed: 0.5,
    screenShake: false,
    masterVolume: 0,
  });
});
