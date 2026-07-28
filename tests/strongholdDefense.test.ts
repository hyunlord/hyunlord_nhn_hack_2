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
            hallDamage: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
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

test("Given the concentrated stronghold, when one hall is threatened, then living regulars from all three houses defend it", () => {
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

test("Given a threat outside every hall defense radius, when combat advances, then it does not produce the three-house defense set", () => {
  const farThreat = { x: 20, y: 20 };
  const initial = createInitialState(803).state;
  assert.ok(
    initial.halls.every(
      (hall) =>
        Math.hypot(hall.x - farThreat.x, hall.y - farThreat.y) >
        BALANCE_CONFIG.HALL_DEFENSE_RADIUS,
    ),
  );

  const combat = combatWithThreat(803, farThreat.x, farThreat.y);

  assert.notDeepEqual(
    defendingHouseIds(combat),
    new Set(["house_a", "house_b", "house_c"]),
  );
});
