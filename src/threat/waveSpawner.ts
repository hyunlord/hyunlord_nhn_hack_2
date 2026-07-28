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
  inset: number,
  worldWidth: number,
  worldHeight: number,
  rng: Rng,
): Point {
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

function chooseDistinctEdges(count: number, rng: Rng): number[] {
  if (!Number.isInteger(count) || count < 1 || count > 4) {
    throw new RangeError(`spawnEdges must be an integer from 1 to 4; got ${count}.`);
  }
  const remaining = [0, 1, 2, 3];
  return Array.from({ length: count }, () => {
    const index = rng.int(0, remaining.length);
    const edge = remaining[index];
    if (edge === undefined) {
      throw new RangeError("Failed to choose a distinct spawn edge.");
    }
    remaining.splice(index, 1);
    return edge;
  });
}

function creaturePoint(
  edge: number,
  anchor: Point,
  worldWidth: number,
  worldHeight: number,
  rng: Rng,
): Point {
  const radius = BALANCE_CONFIG.CREATURE_RADIUS;
  const offset = rng.range(
    -BALANCE_CONFIG.CREATURE_SPAWN_SPREAD,
    BALANCE_CONFIG.CREATURE_SPAWN_SPREAD,
  );
  if (edge === 0 || edge === 2) {
    return {
      x: clamp(anchor.x + offset, radius, worldWidth - radius),
      y: edge === 0 ? radius : worldHeight - radius,
    };
  }
  return {
    x: edge === 1 ? worldWidth - radius : radius,
    y: clamp(anchor.y + offset, radius, worldHeight - radius),
  };
}

export function spawnWave(
  definition: WaveDefinition,
  worldWidth: number,
  worldHeight: number,
  tick: number,
  rng: Rng,
): ThreatEvent {
  const edges = chooseDistinctEdges(definition.spawnEdges, rng);
  const baseCount = Math.floor(
    definition.creatureCount / definition.spawnEdges,
  );
  const remainder = definition.creatureCount % definition.spawnEdges;
  let creatureIndex = 0;
  const creatures = edges.flatMap((edge, edgeIndex) => {
    const count = baseCount + (edgeIndex < remainder ? 1 : 0);
    const anchor = spawnPoint(
      edge,
      BALANCE_CONFIG.CREATURE_RADIUS,
      worldWidth,
      worldHeight,
      rng,
    );
    return Array.from({ length: count }, (): Creature => {
      const index = creatureIndex;
      creatureIndex += 1;
      return {
      id: `w${definition.index}_creature_${String(index).padStart(2, "0")}`,
      ...creaturePoint(edge, anchor, worldWidth, worldHeight, rng),
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
      haltedUntilTick: -1,
      };
    });
  });
  const mageEdge = edges[0];
  if (mageEdge === undefined) {
    throw new RangeError("A wave must have at least one spawn edge.");
  }
  const mage: DarkMage | null = definition.hasMage
    ? {
        ...spawnPoint(
          mageEdge,
          BALANCE_CONFIG.DARK_MAGE_RADIUS,
          worldWidth,
          worldHeight,
          rng,
        ),
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
    daylightRaid: false,
    mage,
    creatures,
  };
}
