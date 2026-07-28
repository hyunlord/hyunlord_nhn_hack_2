import type { LocaleKey, LocaleParams } from "../content/locale";
import { houseName } from "../content/locale/display";
import type { CombatTransientEvent } from "./combatTransientTypes";

type BannerEvent = Extract<
  CombatTransientEvent,
  { kind: "wave_banner" | "banner_destroyed" }
>;
type Translate = (key: LocaleKey, params?: LocaleParams) => string;

export function waveBannerText(
  translate: Translate,
  event: BannerEvent,
): string {
  if (event.kind === "banner_destroyed") {
    return translate("hud.bannerDestroyedAnnouncement", {
      house: houseName(translate, event.houseId),
    });
  }
  const waveText = event.daylightRaid
    ? translate("run.daylightRaid.active", { wave: event.wave })
    : translate("hud.wave", { current: event.wave, total: 3 });
  return `${waveText} · ${translate("hud.creatures", { count: event.creatureCount })}`;
}
