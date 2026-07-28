import { DIVINE_SKILL_DEFINITIONS } from "../skillConfig";
import type { CardEffect } from "../../progression/progression.types";
import type { LocaleKey } from ".";
import { skillName, type Translate, unitClassLabel } from "./domainLabels";

interface EffectLineWriter {
  readonly lines: string[];
  readonly t: Translate;
}

function signedPercent(delta: number): string {
  const rounded = Math.round(delta);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function multiplierPercent(multiplier: number): string {
  return signedPercent((multiplier - 1) * 100);
}

function reciprocalSpeedPercent(intervalMultiplier: number): string {
  return signedPercent((1 / intervalMultiplier - 1) * 100);
}

function signedNumber(value: number): string {
  return `${value > 0 ? "+" : ""}${value}`;
}

function signedPercentPoints(value: number): string {
  const rounded = Math.round(value * 100);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function pushSignedNumberEffect(writer: EffectLineWriter, key: LocaleKey, value: number | undefined): void {
  if (value !== undefined && value !== 0) {
    writer.lines.push(writer.t(key, { value: signedNumber(value) }));
  }
}

function pushMultiplierEffect(writer: EffectLineWriter, key: LocaleKey, value: number | undefined): void {
  if (value !== undefined && value !== 1) {
    writer.lines.push(writer.t(key, { value: multiplierPercent(value) }));
  }
}

function pushReciprocalSpeedEffect(writer: EffectLineWriter, key: LocaleKey, value: number | undefined): void {
  if (value !== undefined && value !== 1) {
    writer.lines.push(writer.t(key, { value: reciprocalSpeedPercent(value) }));
  }
}

function pushBreakHpRatioEffect(writer: EffectLineWriter, value: number | undefined): void {
  if (value !== undefined && value !== 0) {
    const key =
      value > 0
        ? "card.effect.breakHpRatioHigher"
        : "card.effect.breakHpRatioLower";
    writer.lines.push(writer.t(key, { value: signedPercentPoints(value) }));
  }
}

function pushBooleanEffect(writer: EffectLineWriter, key: LocaleKey, enabled: boolean | undefined): void {
  if (enabled === true) {
    writer.lines.push(writer.t(key));
  }
}

export function formatCardEffect(effect: CardEffect, t: Translate): string[] {
  const lines: string[] = [];
  const writer = { lines, t };
  if (effect.unitClass !== undefined) {
    lines.push(t("card.effect.unitClass", { value: unitClassLabel(t, effect.unitClass) }));
  }
  pushMultiplierEffect(writer, "card.effect.attackDamageMultiplier", effect.attackDamageMultiplier);
  pushReciprocalSpeedEffect(writer, "card.effect.attackIntervalMultiplier", effect.attackIntervalMultiplier);
  pushSignedNumberEffect(writer, "card.effect.maxHpBonus", effect.maxHpBonus);
  pushMultiplierEffect(writer, "card.effect.maxHpMultiplier", effect.maxHpMultiplier);
  pushMultiplierEffect(writer, "card.effect.moveSpeedMultiplier", effect.moveSpeedMultiplier);
  pushSignedNumberEffect(writer, "card.effect.threatSenseRadiusBonus", effect.threatSenseRadiusBonus);
  pushBreakHpRatioEffect(writer, effect.breakHpRatioDelta);
  pushSignedNumberEffect(writer, "card.effect.hallDefenseRadiusBonus", effect.hallDefenseRadiusBonus);
  pushMultiplierEffect(writer, "card.effect.divineRegenMultiplier", effect.divineRegenMultiplier);
  pushMultiplierEffect(writer, "card.effect.divineCostMultiplier", effect.divineCostMultiplier);
  pushMultiplierEffect(writer, "card.effect.miracleRadiusMultiplier", effect.miracleRadiusMultiplier);
  pushMultiplierEffect(writer, "card.effect.miracleHealMultiplier", effect.miracleHealMultiplier);
  pushSignedNumberEffect(writer, "card.effect.tributePerKillBonus", effect.tributePerKillBonus);
  pushSignedNumberEffect(writer, "card.effect.interWaveHealBonus", effect.interWaveHealBonus);
  pushMultiplierEffect(writer, "card.effect.heroDamageMultiplier", effect.heroDamageMultiplier);
  pushMultiplierEffect(writer, "card.effect.heroMaxHpMultiplier", effect.heroMaxHpMultiplier);
  pushMultiplierEffect(writer, "card.effect.heroRespawnTicksMultiplier", effect.heroRespawnTicksMultiplier);
  pushSignedNumberEffect(writer, "card.effect.heroAuraRadiusBonus", effect.heroAuraRadiusBonus);
  pushSignedNumberEffect(writer, "card.effect.heroOnKillHeal", effect.heroOnKillHeal);
  if (effect.grantsSkill !== undefined) {
    lines.push(t("card.effect.grantsSkill", { value: skillName(t, DIVINE_SKILL_DEFINITIONS[effect.grantsSkill].id) }));
  }
  pushSignedNumberEffect(writer, "card.effect.divinePowerPerAgentDeath", effect.divinePowerPerAgentDeath);
  pushMultiplierEffect(writer, "card.effect.towerCostMultiplier", effect.towerCostMultiplier);
  pushMultiplierEffect(writer, "card.effect.heroRespawnHpMultiplier", effect.heroRespawnHpMultiplier);
  pushBooleanEffect(writer, "card.effect.ignoreBreak", effect.ignoreBreak);
  pushBooleanEffect(writer, "card.effect.disableHeroRespawn", effect.disableHeroRespawn);
  return lines;
}
