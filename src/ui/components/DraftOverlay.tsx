import {
  useEffect,
  useRef,
  type CSSProperties,
} from "react";
import { useLocale } from "../../content/locale";
import {
  cardName,
  formatCardApplicabilityWarning,
  formatCardEffect,
  houseName,
} from "../../content/locale/display";
import { cardApplicabilityWarnings } from "../../progression/cardApplicability";
import {
  CARD_DEFINITIONS,
} from "../../content/cardConfig";
import {
  frameBackgroundImage,
  RARITY_FRAME_PRESENTATION,
} from "../../content/framePresentation";
import { HOUSE_CONFIG } from "../../content/houseConfig";
import { useGameStore } from "../../state/gameStore";
import { cardEffectIcon } from "../choicePresentation/choiceVisuals";
import { ChoiceIcon } from "./ChoiceIcon";

type DraftCardStyle = CSSProperties & {
  readonly "--rarity-color": string;
  readonly "--rarity-text-color": string;
};

export function DraftOverlay() {
  const { dispatch, state } = useGameStore();
  const { t } = useLocale();
  const buttonReferences = useRef<(HTMLButtonElement | null)[]>([]);
  const returnFocusReference = useRef<HTMLElement | null>(null);
  const offer = state.pendingDrafts[0];
  const house = HOUSE_CONFIG.find(({ id }) => id === offer?.houseId);
  const isDraft = state.phase === "draft" && offer !== undefined;

  useEffect(() => {
    if (!isDraft) {
      return undefined;
    }
    returnFocusReference.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const background = [
      ...document.querySelectorAll<HTMLElement>(
        ".run-stage > :not(.draft-overlay), " +
          ".run-viewport > :not(.run-stage)",
      ),
    ];
    const previousInert = background.map((element) => element.inert);
    background.forEach((element) => {
      element.inert = true;
    });
    return () => {
      background.forEach((element, index) => {
        element.inert = previousInert[index] ?? false;
      });
      returnFocusReference.current?.focus();
      returnFocusReference.current = null;
    };
  }, [isDraft]);

  useEffect(() => {
    if (!isDraft) {
      return;
    }
    buttonReferences.current[0]?.focus();
  }, [isDraft, offer?.id]);

  useEffect(() => {
    if (offer === undefined) {
      return undefined;
    }
    const chooseByKey = (event: KeyboardEvent) => {
      const buttons = buttonReferences.current.filter(
        (button): button is HTMLButtonElement => button !== null,
      );
      if (event.key === "Tab" && buttons.length > 0) {
        const activeIndex = buttons.findIndex(
          (button) => button === document.activeElement,
        );
        const nextIndex = event.shiftKey
          ? (activeIndex - 1 + buttons.length) % buttons.length
          : (activeIndex + 1) % buttons.length;
        event.preventDefault();
        buttons[nextIndex]?.focus();
        return;
      }
      const index = Number(event.key) - 1;
      const cardId = offer.cardIds[index];
      if (cardId === undefined || index < 0 || index > 2) {
        return;
      }
      event.preventDefault();
      dispatch({ type: "chooseDraftCard", offerId: offer.id, cardId });
    };
    window.addEventListener("keydown", chooseByKey);
    return () => window.removeEventListener("keydown", chooseByKey);
  }, [dispatch, offer]);

  if (
    state.phase !== "draft" ||
    offer === undefined ||
    house === undefined
  ) {
    return null;
  }

  return (
    <section
      aria-label={t("draft.label", { house: houseName(t, house.id), level: offer.level })}
      aria-modal="true"
      className="draft-overlay"
      role="dialog"
      style={{ "--draft-house": house.color } as CSSProperties}
    >
      <div className="draft-overlay__header">
        <p>{t("draft.eyebrow")}</p>
        <h2>{t("draft.heading", { house: houseName(t, house.id), level: offer.level })}</h2>
        <span>{t("draft.choose")}</span>
      </div>
      <div className="choice-deck draft-card-list">
        {offer.cardIds.map((cardId, index) => {
          const card = CARD_DEFINITIONS.find(({ id }) => id === cardId);
          if (card === undefined) {
            return null;
          }
          const presentation = RARITY_FRAME_PRESENTATION[card.rarity];
          const backgroundImage = frameBackgroundImage(presentation);
          const style: DraftCardStyle =
            backgroundImage === undefined
              ? {
                  "--rarity-color": presentation.borderColor,
                  "--rarity-text-color": presentation.labelColor,
                }
              : {
                  "--rarity-color": presentation.borderColor,
                  "--rarity-text-color": presentation.labelColor,
                  backgroundImage,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "100% 100%",
                };
          const cardEffects = formatCardEffect(card.effect, t);
          const applicabilityWarnings = cardApplicabilityWarnings({
            card,
            selectedHouseIds: state.selectedHouseIds,
            agents: state.agents,
            keep: state.keep,
            banners: state.banners,
          });
          const warningText = applicabilityWarnings
            .map((warning) => formatCardApplicabilityWarning(t, warning))
            .join(" ");
          const effectLine = cardEffects.join(" · ");
          return (
            <button
              className="draft-card"
              data-frame-sprite={presentation.frameSpriteId}
              key={card.id}
              onClick={() =>
                dispatch({
                  type: "chooseDraftCard",
                  offerId: offer.id,
                  cardId,
                })
              }
              ref={(element) => {
                buttonReferences.current[index] = element;
              }}
              style={style}
              title={warningText.length > 0 ? warningText : undefined}
              type="button"
            >
              <span className="draft-card__content">
                <span className="choice-card__icon-row">
                  <ChoiceIcon name={cardEffectIcon(card.effect)} />
                  {warningText.length > 0 ? (
                    <ChoiceIcon label={warningText} name="warning" />
                  ) : null}
                </span>
                <strong className="choice-card__name">{cardName(t, card.id)}</strong>
                <span className="choice-card__effect">
                  {t("draft.effectLabel", { text: effectLine })}
                </span>
                <kbd>{index + 1}</kbd>
              </span>
            </button>
          );
        })}
      </div>
      <p className="draft-overlay__queue" aria-live="polite">
        {state.pendingDrafts.length > 1
          ? t("draft.queue.more", { count: state.pendingDrafts.length - 1 })
          : t("draft.queue.final")}
      </p>
    </section>
  );
}
