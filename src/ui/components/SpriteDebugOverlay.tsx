import { useEffect, useMemo, useState } from "react";
import { SPRITE_IDS } from "../../content/assetManifest";
import { useLocale } from "../../content/locale";
import {
  getStatus,
  loadedCount,
  type LoadedCount,
} from "../../render/assets/spriteLoader";

const REFRESH_INTERVAL_MS = 250;

type SpriteSnapshot = {
  readonly count: LoadedCount;
  readonly missingIds: readonly string[];
};

function readSpriteSnapshot(): SpriteSnapshot {
  return {
    count: loadedCount(),
    missingIds: SPRITE_IDS.filter((id) => getStatus(id) === "missing").sort(),
  };
}

function isToggleShortcut(event: KeyboardEvent): boolean {
  return (
    event.shiftKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.repeat &&
    event.key.toLowerCase() === "d"
  );
}

export function SpriteDebugOverlay() {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<SpriteSnapshot>(() =>
    readSpriteSnapshot(),
  );

  useEffect(() => {
    const toggleOnShortcut = (event: KeyboardEvent) => {
      if (!isToggleShortcut(event)) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      setIsOpen((current) => !current);
    };
    window.addEventListener("keydown", toggleOnShortcut);
    return () => window.removeEventListener("keydown", toggleOnShortcut);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    setSnapshot(readSpriteSnapshot());
    const intervalId = window.setInterval(() => {
      setSnapshot(readSpriteSnapshot());
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [isOpen]);

  const statusLabel = useMemo(() => {
    const { missing, ready, total } = snapshot.count;
    return t("debug.sprites.status", { missing, ready, total });
  }, [snapshot.count, t]);

  if (!isOpen) {
    return null;
  }

  return (
    <aside
      aria-label={t("debug.sprites.label")}
      className="sprite-debug-overlay"
    >
      <div className="sprite-debug-overlay__header">
        <p>{t("debug.sprites.heading")}</p>
        <kbd>Shift+D</kbd>
      </div>
      <p
        aria-atomic="true"
        aria-live="polite"
        className="sprite-debug-overlay__status"
        role="status"
      >
        {statusLabel}
      </p>
      <div className="sprite-debug-overlay__missing">
        <p>{t("debug.sprites.missing")}</p>
        {snapshot.missingIds.length === 0 ? (
          <p className="sprite-debug-overlay__empty">{t("debug.sprites.none")}</p>
        ) : (
          <ul>
            {snapshot.missingIds.map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
