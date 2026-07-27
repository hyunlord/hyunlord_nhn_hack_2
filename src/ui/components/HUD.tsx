import { useGameStore } from "../../state/gameStore";
import { BALANCE_CONFIG } from "../../content/balanceConfig";
import { WAVE_DEFINITIONS } from "../../content/waveConfig";
import { LEVEL_THRESHOLDS } from "../../progression/xp";
import { HERO_LEVEL_THRESHOLDS } from "../../progression/xp";
import { HERO_DEFINITIONS } from "../../content/heroConfig";
import type { LegacyRiteGroup } from "../investmentSummary";

const EMPTY_LEGACY_RITES: readonly LegacyRiteGroup[] = [];

export function HUD({
  legacyRites = EMPTY_LEGACY_RITES,
}: {
  readonly legacyRites?: readonly LegacyRiteGroup[];
}) {
  const { state } = useGameStore();

  return (
    <section className="hud-panel" aria-label="World status">
      <div className="hud-heading">
        <h2>Run status</h2>
        <span className="tick-counter">Tick {state.tick}</span>
      </div>
      <div className="phase-status">
        <span>
          Wave {state.waveIndex + 1}/{WAVE_DEFINITIONS.length} ·{" "}
          {WAVE_DEFINITIONS[state.waveIndex]?.label ?? "Unknown"}
        </span>
        <strong>{state.phase}</strong>
      </div>
      <div className="run-economy">
        <span>Tribute</span>
        <strong>{state.tribute}</strong>
      </div>
      {legacyRites.length === 0 ? null : (
        <section className="legacy-rites" aria-labelledby="legacy-rites-heading">
          <h3 id="legacy-rites-heading">Legacy rites</h3>
          <div className="legacy-rites__groups">
            {legacyRites.map((group) => (
              <section
                aria-label={`${group.heading} Legacy rites`}
                className="legacy-rites__group"
                key={group.heading}
              >
                <h4>{group.heading}</h4>
                <ul>
                  {group.items.map((item) => (
                    <li key={`${group.heading}:${item.name}`}>
                      <strong>{item.name}</strong>
                      <span>
                        {item.rank} · {item.effect}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      )}
      {state.activeThreat === null ? null : (
        <div className="invasion-status" aria-label="Invasion status">
          <span>
            {state.activeThreat.creatures.length} creatures remaining
          </span>
          {state.activeThreat.mage === null ? null : (
            <strong>
              Mage {state.activeThreat.mage.hp}/
              {BALANCE_CONFIG.DARK_MAGE_HP} HP
            </strong>
          )}
        </div>
      )}
      <div className="divine-power">
        <div className="divine-power-label">
          <span>Divine power</span>
          <strong>
            {state.divinePower.toFixed(1)}/{BALANCE_CONFIG.DIVINE_POWER_MAX}
          </strong>
        </div>
        <progress
          aria-label="Divine power"
          max={BALANCE_CONFIG.DIVINE_POWER_MAX}
          value={state.divinePower}
        />
      </div>
      <ul className="house-status-list">
        {state.houses.map((house) => {
          const livingCount = state.agents.filter(
            (agent) =>
              agent.houseId === house.id && agent.state !== "dead",
          ).length;
          const hall = state.halls.find(
            ({ houseId }) => houseId === house.id,
          );
          const progress = state.houseProgress.find(
            ({ houseId }) => houseId === house.id,
          );
          const level = progress?.level ?? 1;
          const levelStart = LEVEL_THRESHOLDS[level - 1] ?? 0;
          const nextThreshold = LEVEL_THRESHOLDS[level];
          const xpWithinLevel = Math.max(
            0,
            (progress?.xp ?? 0) - levelStart,
          );
          const xpSpan =
            nextThreshold === undefined
              ? 1
              : nextThreshold - levelStart;

          return (
            <li key={house.id}>
              <span
                aria-hidden="true"
                className="house-swatch"
                style={{ backgroundColor: house.color }}
              />
              <span className="house-status__name">{house.name}</span>
              <span className="house-status__details">
                <strong>
                  Level {level} · {Math.round(progress?.xp ?? 0)} XP
                </strong>
                <span>
                  Hall {hall?.hp ?? 0}/
                  {hall?.maxHp ?? BALANCE_CONFIG.HALL_HP} · {livingCount} living
                </span>
                <progress
                  aria-label={`${house.name} XP to next level`}
                  max={xpSpan}
                  value={
                    nextThreshold === undefined ? xpSpan : xpWithinLevel
                  }
                />
              </span>
            </li>
          );
        })}
      </ul>
      <div className="hero-progress-list" aria-label="Hero progression">
        <h3>Heroes</h3>
        {state.heroProgress.map((progress) => {
          const definition = HERO_DEFINITIONS.find(
            ({ id }) => id === progress.heroId,
          );
          const currentThreshold =
            HERO_LEVEL_THRESHOLDS[progress.level - 1] ?? 0;
          const nextThreshold =
            HERO_LEVEL_THRESHOLDS[progress.level];
          const span =
            nextThreshold === undefined
              ? 1
              : nextThreshold - currentThreshold;
          return (
            <div className="hero-progress-row" key={progress.heroId}>
              <span>
                <strong>{definition?.name ?? progress.heroId}</strong>
                <small>
                  Level {progress.level} · {Math.round(progress.xp)} XP
                </small>
              </span>
              <progress
                aria-label={`${definition?.name ?? progress.heroId} XP`}
                max={span}
                value={
                  nextThreshold === undefined
                    ? span
                    : progress.xp - currentThreshold
                }
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
