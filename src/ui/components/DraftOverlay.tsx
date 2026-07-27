import {
  useEffect,
  useRef,
  type CSSProperties,
} from "react";
import {
  CARD_DEFINITIONS,
  RARITY_COLORS,
  RARITY_TEXT_COLORS,
} from "../../content/cardConfig";
import { HOUSE_CONFIG } from "../../content/houseConfig";
import { useGameStore } from "../../state/gameStore";

type DraftCardStyle = CSSProperties & {
  readonly "--rarity-color": string;
  readonly "--rarity-text-color": string;
};

export function DraftOverlay() {
  const { dispatch, state } = useGameStore();
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
      aria-label={`${house.name} level ${offer.level} card draft`}
      aria-modal="true"
      className="draft-overlay"
      role="dialog"
      style={{ "--draft-house": house.color } as CSSProperties}
    >
      <div className="draft-overlay__header">
        <p>House ascendant</p>
        <h2>{house.name} · Level {offer.level}</h2>
        <span>Choose one lasting boon</span>
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
          const style: DraftCardStyle = {
            "--rarity-color": RARITY_COLORS[card.rarity],
            "--rarity-text-color": RARITY_TEXT_COLORS[card.rarity],
          };
          return (
            <button
              className="draft-card"
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
              <span className="draft-card__meta">
                <span>
                  <b>{card.rarity}</b> · {card.kind}
                </span>
                <kbd>{index + 1}</kbd>
              </span>
              <strong>{card.name}</strong>
              <span className="draft-card__description">
                {card.description}
              </span>
              <span className="draft-card__stacks">
                Current stacks {stacks}/{card.maxStacks}
              </span>
            </button>
          );
        })}
      </div>
      <p className="draft-overlay__queue" aria-live="polite">
        {state.pendingDrafts.length > 1
          ? `${state.pendingDrafts.length - 1} more queued`
          : "Final choice in queue"}
      </p>
    </section>
  );
}
