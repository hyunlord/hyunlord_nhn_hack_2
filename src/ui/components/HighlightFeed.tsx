import { useLocale } from "../../content/locale";

export function HighlightFeed() {
  const { t } = useLocale();

  return (
    <section className="highlight-feed run-hud-top-left-secondary" aria-label={t("highlight.label")}>
      <h2>{t("highlight.heading")}</h2>
      <p>{t("highlight.empty")}</p>
    </section>
  );
}
