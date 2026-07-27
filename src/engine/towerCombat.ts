import { TOWER_CONFIG } from "../build/structures";
import { applyDamageToThreat } from "../threat/waveDirector";
import type { ThreatEvent } from "../threat/threatTypes";
import type { Tower } from "../build/build.types";

type Target = {
  readonly key: string;
  readonly creatureId: string | null;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
};

function distanceSquared(
  first: { readonly x: number; readonly y: number },
  second: { readonly x: number; readonly y: number },
): number {
  return (first.x - second.x) ** 2 + (first.y - second.y) ** 2;
}

export function applyTowerAttacks(
  towers: readonly Tower[],
  threat: ThreatEvent,
  tick: number,
): { readonly towers: Tower[]; readonly threat: ThreatEvent } {
  let currentThreat = threat;
  const nextTowers = towers.map((tower) => {
    if (
      tower.hp <= 0 ||
      tick - tower.lastAttackTick <
        TOWER_CONFIG.TOWER_ATTACK_INTERVAL_TICKS
    ) {
      return tower;
    }
    const targets: Target[] = [
      ...currentThreat.creatures.map((creature) => ({
        key: creature.id,
        creatureId: creature.id,
        x: creature.x,
        y: creature.y,
        hp: creature.hp,
      })),
      ...(currentThreat.mage !== null && currentThreat.mage.hp > 0
        ? [{
            key: "mage",
            creatureId: null,
            x: currentThreat.mage.x,
            y: currentThreat.mage.y,
            hp: currentThreat.mage.hp,
          }]
        : []),
    ];
    const target = targets
      .filter(
        (candidate) =>
          distanceSquared(tower, candidate) <=
            TOWER_CONFIG.TOWER_RANGE ** 2,
      )
      .sort((first, second) => {
        const delta =
          distanceSquared(tower, first) -
          distanceSquared(tower, second);
        return delta || first.key.localeCompare(second.key);
      })[0];
    if (target === undefined) {
      return tower;
    }
    currentThreat = applyDamageToThreat(currentThreat, [
      {
        creatureId: target.creatureId,
        amount: TOWER_CONFIG.TOWER_DAMAGE,
      },
    ]);
    return { ...tower, lastAttackTick: tick };
  });
  return { towers: nextTowers, threat: currentThreat };
}
