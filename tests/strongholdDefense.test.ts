import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { HOUSE_SPAWN_SLOTS } from "../src/content/houseConfig";
import { advanceWaveCombat } from "../src/engine/invasionCombat";
import { createRng } from "../src/engine/prng";
import { createInitialState } from "../src/engine/tick";

function combatWithThreat(seed: number, x: number, y: number) {
  const initial = createInitialState(seed, [
    "house_a",
    "house_b",
    "house_c",
  ]).state;
  return advanceWaveCombat(
    {
      ...initial,
      phase: "wave",
      activeThreat: {
        type: "monster_horde",
        waveIndex: 0,
        startTick: 0,
        daylightRaid: false,
        traitorHouseId: null,
        creatures: [
          {
            id: `creature_${seed}`,
            x,
            y,
            hp: BALANCE_CONFIG.CREATURE_HP,
            agentDamage: BALANCE_CONFIG.CREATURE_ATTACK_DAMAGE,
            structureDamage: BALANCE_CONFIG.CREATURE_STRUCTURE_DAMAGE,
            lastAttackTick: -1,
            haltedUntilTick: -1,
          },
        ],
        mage: null,
      },
    },
    1,
    createRng(seed),
  );
}

function defendingHouseIds(
  combat: ReturnType<typeof combatWithThreat>,
): ReadonlySet<string> {
  return new Set(
    combat.agents
      .filter(
        ({ isHero, state }) =>
          !isHero && (state === "fighting" || state === "helping"),
      )
      .map(({ houseId }) => houseId),
  );
}

test("Given the concentrated stronghold, when one defense is threatened, then living regulars from all three houses defend it", () => {
  const [north] = HOUSE_SPAWN_SLOTS;
  if (north === undefined) {
    throw new RangeError("Expected north spawn slot.");
  }

  const combat = combatWithThreat(802, north.x, north.y);

  assert.deepEqual(
    defendingHouseIds(combat),
    new Set(["house_a", "house_b", "house_c"]),
  );
});

test("Given a threat outside the keep defense radius, when combat advances, then the shared line still uses all three houses", () => {
  const farThreat = { x: 20, y: 20 };
  const initial = createInitialState(803).state;
  assert.ok(
    Math.hypot(initial.keep.x - farThreat.x, initial.keep.y - farThreat.y) >
      BALANCE_CONFIG.KEEP_DEFENSE_RADIUS,
  );

  const combat = combatWithThreat(803, farThreat.x, farThreat.y);

  assert.deepEqual(
    defendingHouseIds(combat),
    new Set(["house_a", "house_b", "house_c"]),
  );
});
