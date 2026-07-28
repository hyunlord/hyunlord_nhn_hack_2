import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BALANCE_CONFIG } from "../../content/balanceConfig";
import { useLocale } from "../../content/locale";
import { miracleName, skillDescription, skillName } from "../../content/locale/display";
import { DIVINE_SKILL_DEFINITIONS } from "../../content/skillConfig";
import type { DivineSkillId } from "../../divine/skillTypes";
import { canCastSkill } from "../../divine/skillResolver";
import { canCast } from "../../divine/miracleResolver";
import { MIRACLE_DEFINITIONS } from "../../divine/miracleTypes";
import { divineModifiersForState } from "../../engine/progressionEngine";
import { useGameStore } from "../../state/gameStore";

const MIRACLE_ORDER = ["lightning", "blessing", "curse"] as const;
const MIRACLE_KEYS = ["Q", "W", "E"] as const;
const SKILL_KEYS = ["R", "T", "Y", "U"] as const;

type AbilityButtonStyle = CSSProperties & { readonly "--miracle-color": string };

export function MiracleButtons() {
  const { t } = useLocale();
  const {
    dispatch,
    selectedMiracle,
    selectedSkill,
    selectMiracle,
    selectSkill,
    state,
  } = useGameStore();
  const { divinePower, miracleCooldowns, phase, skillCooldowns, unlockedSkills } = state;
  const modifiers = divineModifiersForState(state);
  const previousSkills = useRef<readonly DivineSkillId[]>(unlockedSkills);
  const [flashingSkill, setFlashingSkill] = useState<DivineSkillId | null>(null);

  const activePhase = phase === "preparation" || phase === "wave";
  const miracleEnabled = (type: (typeof MIRACLE_ORDER)[number]) =>
    activePhase && canCast(type, divinePower, miracleCooldowns[type], modifiers);
  const skillEnabled = (skill: DivineSkillId) =>
    activePhase &&
    canCastSkill(
      skill,
      unlockedSkills,
      divinePower,
      skillCooldowns[skill],
      modifiers.divineCostMultiplier,
    );

  function activateSkill(skill: DivineSkillId): void {
    if (!skillEnabled(skill)) {
      return;
    }
    const definition = DIVINE_SKILL_DEFINITIONS[skill];
    if (!definition.targeted) {
      dispatch({
        type: "castSkill",
        skill,
        x: BALANCE_CONFIG.WORLD_WIDTH / 2,
        y: BALANCE_CONFIG.WORLD_HEIGHT / 2,
      });
      return;
    }
    selectSkill(selectedSkill === skill ? null : skill);
  }

  useEffect(() => {
    const acquired = unlockedSkills.find((skill) => !previousSkills.current.includes(skill));
    previousSkills.current = unlockedSkills;
    if (acquired === undefined) {
      return undefined;
    }
    setFlashingSkill(acquired);
    const timeout = window.setTimeout(() => setFlashingSkill(null), 1_500);
    return () => window.clearTimeout(timeout);
  }, [unlockedSkills]);

  useEffect(() => {
    const activateByKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) {
        return;
      }
      const key = event.key.toUpperCase();
      const miracleIndex = MIRACLE_KEYS.findIndex((candidate) => candidate === key);
      if (miracleIndex >= 0) {
        const miracle = MIRACLE_ORDER[miracleIndex];
        if (miracle !== undefined && miracleEnabled(miracle)) {
          event.preventDefault();
          selectMiracle(selectedMiracle === miracle ? null : miracle);
        }
        return;
      }
      const skillIndex = SKILL_KEYS.findIndex((candidate) => candidate === key);
      const skill = unlockedSkills[skillIndex];
      if (skill !== undefined && skillEnabled(skill)) {
        event.preventDefault();
        activateSkill(skill);
      }
    };
    window.addEventListener("keydown", activateByKey);
    return () => window.removeEventListener("keydown", activateByKey);
  });

  return (
    <section className="miracle-panel run-hud-bottom-center" aria-label={t("abilities.label")}>
      <h2>{t("abilities.heading")}</h2>
      <div className="miracle-button-list">
        {MIRACLE_ORDER.map((type, index) => {
          const definition = MIRACLE_DEFINITIONS[type];
          const cooldown = miracleCooldowns[type];
          const selected = selectedMiracle === type;
          const enabled = miracleEnabled(type);
          const style: AbilityButtonStyle = { "--miracle-color": definition.color };
          return (
            <button
              aria-pressed={selected}
              className="miracle-button"
              disabled={!enabled}
              key={type}
              onClick={() => selectMiracle(selected ? null : type)}
              style={style}
              type="button"
            >
              <kbd>{MIRACLE_KEYS[index]}</kbd>
              <span>{miracleName(t, type)}</span>
              <span className="miracle-cost">
                {t("abilities.cost", {
                  cost: (definition.cost * modifiers.divineCostMultiplier).toFixed(0),
                })}
              </span>
              {cooldown > 0 ? (
                <span className="miracle-cooldown">
                  {t("abilities.cooldown", {
                    seconds: (cooldown / BALANCE_CONFIG.TICKS_PER_SECOND).toFixed(1),
                  })}
                </span>
              ) : null}
            </button>
          );
        })}
        {unlockedSkills.map((skill, index) => {
          const definition = DIVINE_SKILL_DEFINITIONS[skill];
          const cooldown = skillCooldowns[skill];
          const selected = selectedSkill === skill;
          const enabled = skillEnabled(skill);
          const style: AbilityButtonStyle = { "--miracle-color": definition.color };
          return (
            <button
              aria-pressed={selected}
              className={flashingSkill === skill ? "miracle-button miracle-button--new" : "miracle-button"}
              disabled={!enabled}
              key={skill}
              onClick={() => activateSkill(skill)}
              style={style}
              title={skillDescription(t, skill)}
              type="button"
            >
              <kbd>{SKILL_KEYS[index] ?? "-"}</kbd>
              <span>{skillName(t, skill)}</span>
              <span className="miracle-cost">
                {t("abilities.cost", {
                  cost: (definition.cost * modifiers.divineCostMultiplier).toFixed(0),
                })}
              </span>
              {cooldown > 0 ? (
                <span className="miracle-cooldown">
                  {t("abilities.cooldown", {
                    seconds: (cooldown / BALANCE_CONFIG.TICKS_PER_SECOND).toFixed(1),
                  })}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
