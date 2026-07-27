import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { Rng } from "../content/random";
import type { WaveDefinition } from "../content/waveConfig";
import type {
  Creature,
  DarkMage,
  ThreatEvent,
} from "./threatTypes";
import { clamp, type Point } from "./threatMotion";

function spawnPoint(
  edge: number,
  worldWidth: number,
  worldHeight: number,
  rng: Rng,
): Point {
  const inset = BALANCE_CONFIG.DARK_MAGE_RADIUS;
  if (edge === 0) {
    return {
      x: rng.range(inset, worldWidth - inset),
      y: inset,
    };
  }
  if (edge === 1) {
    return {
      x: worldWidth - inset,
      y: rng.range(inset, worldHeight - inset),
    };
  }
  if (edge === 2) {
    return {
      x: rng.range(inset, worldWidth - inset),
      y: worldHeight - inset,
    };
  }
  return {
    x: inset,
    y: rng.range(inset, worldHeight - inset),
  };
}

export function spawnWave(
  definition: WaveDefinition,
  worldWidth: number,
  worldHeight: number,
  tick: number,
  rng: Rng,
): ThreatEvent {
  const anchor = spawnPoint(
    rng.int(0, 4),
    worldWidth,
    worldHeight,
    rng,
  );
  const radius = BALANCE_CONFIG.CREATURE_RADIUS;
  const creatures = Array.from(
    { length: definition.creatureCount },
    (_, index): Creature => ({
      id: `w${definition.index}_creature_${String(index).padStart(2, "0")}`,
      x: clamp(
        anchor.x +
          rng.range(
            -BALANCE_CONFIG.CREATURE_SPAWN_SPREAD,
            BALANCE_CONFIG.CREATURE_SPAWN_SPREAD,
          ),
        radius,
        worldWidth - radius,
      ),
      y: clamp(
        anchor.y +
          rng.range(
            -BALANCE_CONFIG.CREATURE_SPAWN_SPREAD,
            BALANCE_CONFIG.CREATURE_SPAWN_SPREAD,
          ),
        radius,
        worldHeight - radius,
      ),
      hp: Math.round(
        BALANCE_CONFIG.CREATURE_HP * definition.creatureHpMultiplier,
      ),
      agentDamage: Math.round(
        BALANCE_CONFIG.CREATURE_ATTACK_DAMAGE *
          definition.creatureDamageMultiplier,
      ),
      hallDamage: Math.round(
        BALANCE_CONFIG.CREATURE_HALL_DAMAGE *
          definition.creatureDamageMultiplier,
      ),
      lastAttackTick: -1,
    }),
  );
  const mage: DarkMage | null = definition.hasMage
    ? {
        ...anchor,
        hp: BALANCE_CONFIG.DARK_MAGE_HP,
        hallDamage: Math.round(
          BALANCE_CONFIG.CREATURE_HALL_DAMAGE *
            definition.creatureDamageMultiplier,
        ),
        lastAttackTick: -1,
      }
    : null;

  return {
    type: "dark_mage_invasion",
    waveIndex: definition.index,
    startTick: tick,
    traitorHouseId: null,
    mage,
    creatures,
  };
}
