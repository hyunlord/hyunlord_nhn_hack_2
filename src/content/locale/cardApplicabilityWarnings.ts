import type { CardApplicabilityWarning } from "../../progression/cardApplicability";
import { heroName, houseName, type Translate, unitClassLabel } from "./domainLabels";

function assertNever(value: never): never {
  throw new Error(`Unhandled card applicability warning: ${String(value)}`);
}

export function formatCardApplicabilityWarning(
  t: Translate,
  warning: CardApplicabilityWarning,
): string {
  switch (warning.kind) {
    case "lowClassShare":
      return t("draft.warning.classShare", {
        class: unitClassLabel(t, warning.unitClass),
        percent: warning.sharePercent,
      });
    case "deadHero":
      return t("draft.warning.deadHero", {
        hero: heroName(t, warning.heroId),
      });
    case "fallenHouseHall":
      return t("draft.warning.fallenHall", {
        house: houseName(t, warning.houseId),
      });
    default:
      return assertNever(warning);
  }
}
