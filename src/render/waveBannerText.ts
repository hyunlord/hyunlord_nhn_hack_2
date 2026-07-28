import type { LocaleKey, LocaleParams } from "../content/locale";
import type { CombatTransientEvent } from "./combatTransientTypes";

type WaveBannerEvent = Extract<CombatTransientEvent, { kind: "wave_banner" }>;
type Translate = (key: LocaleKey, params?: LocaleParams) => string;

export function waveBannerText(
  translate: Translate,
  event: WaveBannerEvent,
): string {
  const waveText = event.daylightRaid
    ? translate("run.daylightRaid.active", { wave: event.wave })
    : translate("hud.wave", { current: event.wave, total: 3 });
  return `${waveText} · ${translate("hud.creatures", { count: event.creatureCount })}`;
}
