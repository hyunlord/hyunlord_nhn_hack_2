import {
  useEffect,
  useRef,
  type CSSProperties,
} from "react";
import { useLocale } from "../../content/locale";
import {
  cardDescription,
  cardKindLabel,
  cardName,
  cardRarityLabel,
  formatCardApplicabilityWarning,
  formatCardEffect,
  houseName,
} from "../../content/locale/display";
import { cardApplicabilityWarnings } from "../../progression/cardApplicability";
import {
  CARD_DEFINITIONS,
} from "../../content/cardConfig";
import {
  FRAME_CONTENT_PERCENT,
  frameBackgroundImage,
  RARITY_FRAME_PRESENTATION,
} from "../../content/framePresentation";
import { HOUSE_CONFIG } from "../../content/houseConfig";
import { useGameStore } from "../../state/gameStore";

type DraftCardStyle = CSSProperties & {
  readonly "--rarity-color": string;
  readonly "--rarity-text-color": string;
};

const FRAME_CONTENT_STYLE = {
  height: `${FRAME_CONTENT_PERCENT.height}%`,
  left: `${FRAME_CONTENT_PERCENT.left}%`,
  top: `${FRAME_CONTENT_PERCENT.top}%`,
  width: `${FRAME_CONTENT_PERCENT.width}%`,
} as const satisfies CSSProperties;

export function DraftOverlay() {
  const { dispatch, state } = useGameStore();
  const { t } = useLocale();
  const buttonReferences = useRef<(HTMLButtonElement | null)[]>([]);
  const returnFocusReference = useRef<HTMLElement | null>(null);
  const offer = state.pendingDrafts[0];
  const house = HOUSE_CONFIG.find(({ id }) => id === offer?.houseId);
  const progress = state.houseProgress.find(
    ({ houseId }) => houseId === offer?.houseId,
  );
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
        ".canvas-panel > :not(.draft-overlay), " +
          ".scaffold-grid > :not(.canvas-panel)",
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
    house === undefined ||
    progress === undefined
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
      <div className="draft-card-list">
        {offer.cardIds.map((cardId, index) => {
          const card = CARD_DEFINITIONS.find(({ id }) => id === cardId);
          if (card === undefined) {
            return null;
          }
          const stacks =
            progress.cards.find((owned) => owned.cardId === card.id)
              ?.stacks ?? 0;
          const presentation = RARITY_FRAME_PRESENTATION[card.rarity];
          const backgroundImage = frameBackgroundImage(
            presentation,
            "var(--draft-panel)",
          );
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
                  backgroundRepeat: "no-repeat, repeat",
                  backgroundSize: "100% 100%, auto",
                };
          const cardEffects = formatCardEffect(card.effect, t);
          const applicabilityWarnings = cardApplicabilityWarnings({
            card,
            selectedHouseIds: state.selectedHouseIds,
            agents: state.agents,
            halls: state.halls,
          });
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
              type="button"
            >
              <span
                className="draft-card__content"
                style={FRAME_CONTENT_STYLE}
              >
                <span className="draft-card__meta">
                  <span>
                    <b>{cardRarityLabel(t, card.rarity)}</b> · {cardKindLabel(t, card.kind)}
                  </span>
                  <kbd>{index + 1}</kbd>
                </span>
                <strong>{cardName(t, card.id)}</strong>
                {cardEffects.length > 0 ? (
                  <span className="draft-card__effects">
                    {cardEffects.map((line, effectIndex) => (
                      <span
                        className="draft-card__effect"
                        key={`${card.id}-effect-${effectIndex}`}
                      >
                        {t("draft.effectLabel", { text: line })}
                      </span>
                    ))}
                  </span>
                ) : null}
                {applicabilityWarnings.map((warning) => (
                  <span
                    className="draft-card__warning"
                    key={`${card.id}-warning-${warning.kind}`}
                  >
                    {t("draft.warning.class", {
                      text: formatCardApplicabilityWarning(t, warning),
                    })}
                  </span>
                ))}
                <span className="draft-card__description">
                  {cardDescription(t, card.id)}
                </span>
                <span className="draft-card__stacks">
                  {t("draft.stacks", { current: stacks, max: card.maxStacks })}
                </span>
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
