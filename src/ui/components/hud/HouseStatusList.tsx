import type { GameState } from "../../../engine/engine.types";
import { livingRegularCount, populationCapForHouse } from "../../../engine/population";
import { LEVEL_THRESHOLDS } from "../../../progression/xp";
import type { Translate } from "../../../content/locale/display";
import {
  classShareFromTally,
  dominantUnitClass,
  houseName,
  unitClassLabel,
  unitTallyByHouse,
} from "../../../content/locale/display";

interface HouseStatusListProps {
  readonly state: GameState;
  readonly t: Translate;
}

function segmentFill(houseColor: string, index: number): string {
  return `color-mix(in srgb, ${houseColor} ${40 + index * 14}%, var(--panel))`;
}

export function HouseStatusList({ state, t }: HouseStatusListProps) {
  return (
    <ul className="house-status-list" aria-label={t("hud.houses")}>
      {state.houses.map((house) => {
        const progress = state.houseProgress.find(({ houseId }) => houseId === house.id);
        const level = progress?.level ?? 1;
        const levelStart = LEVEL_THRESHOLDS[level - 1] ?? 0;
        const nextThreshold = LEVEL_THRESHOLDS[level];
        const xpSpan = nextThreshold === undefined ? 1 : nextThreshold - levelStart;
        const livingCount = state.agents.filter(
          (agent) => agent.houseId === house.id && agent.state !== "dead",
        ).length;
        const composition = unitTallyByHouse(state.agents, house.id);
        const compositionShare = classShareFromTally(composition);
        const roleClass = dominantUnitClass(composition);
        const name = houseName(t, house.id);
        return (
          <li key={house.id}>
            <span aria-hidden="true" className="house-swatch" style={{ backgroundColor: house.color }} />
            <span className="house-status__name">{name}</span>
            <span className="house-status__details">
              <strong>{t("hud.levelXp", { level, xp: Math.round(progress?.xp ?? 0) })}</strong>
              <span>
                {t("hud.livingCap", {
                  cap: populationCapForHouse(house.id, level),
                  count: livingRegularCount(state, house.id),
                  living: livingCount,
                })}
              </span>
              <progress
                aria-label={t("hud.houseXp", { house: name })}
                max={xpSpan}
                value={nextThreshold === undefined ? xpSpan : Math.max(0, (progress?.xp ?? 0) - levelStart)}
              />
            </span>
            <div className="house-composition" aria-label={t("hud.houseComposition", { house: name })} role="group">
              <strong className="house-role-tag">
                {roleClass === undefined ? t("hud.role.empty") : unitClassLabel(t, roleClass)}
              </strong>
              <div className="house-composition__bar">
                {compositionShare.map(({ unitClass, count, percent }, index) => {
                  const label = t("hud.classShare", {
                    class: unitClassLabel(t, unitClass),
                    count,
                    percent: Math.round(percent),
                  });
                  return (
                    <span
                      aria-label={label}
                      className="house-composition__segment"
                      key={unitClass}
                      style={{
                        background: segmentFill(house.color, index),
                        width: `${Math.round(percent)}%`,
                      }}
                      title={label}
                    />
                  );
                })}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
