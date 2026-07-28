import {
  createContext,
  createElement,
  useContext,
  type PropsWithChildren,
} from "react";
import { en } from "./en";
import { ko } from "./ko";

export const LOCALES = {
  ko,
  en,
} as const;

export type Language = keyof typeof LOCALES;
export type LocaleKey = keyof typeof ko;
export type LocaleParams = Readonly<Record<string, string | number>>;

interface LocaleValue {
  readonly language: Language;
  readonly t: (key: LocaleKey, params?: LocaleParams) => string;
}

const LocaleContext = createContext<LocaleValue | undefined>(undefined);

const warnedMissingKeys = new Set<string>();

export function translate(
  language: Language,
  key: string,
  params: LocaleParams = {},
): string {
  const template = LOCALES[language][key as LocaleKey] as string | undefined;
  if (template === undefined) {
    const warningId = `${language}:${key}`;
    if (!warnedMissingKeys.has(warningId)) {
      warnedMissingKeys.add(warningId);
      console.warn(`[locale] Missing ${language} translation: ${key}`);
    }
    return key;
  }

  let message = template;
  for (const [name, value] of Object.entries(params)) {
    message = message.replaceAll(`{${name}}`, String(value));
  }
  return message;
}

export function LocaleProvider({
  children,
  language,
}: PropsWithChildren<{ readonly language: Language }>) {
  const value: LocaleValue = {
    language,
    t: (key, params) => translate(language, key, params),
  };
  return createElement(LocaleContext.Provider, { value }, children);
}

export function useLocale(): LocaleValue {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used inside LocaleProvider.");
  }
  return context;
}
