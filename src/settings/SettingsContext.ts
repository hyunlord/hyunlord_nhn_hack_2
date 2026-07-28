import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { LocaleProvider } from "../content/locale";
import {
  loadSettings,
  saveSettings,
  updateSettings,
  type SettingsState,
  type SettingsUpdate,
} from "./settings";

interface SettingsValue {
  readonly settings: SettingsState;
  readonly setSettings: (update: SettingsUpdate) => void;
}

const SettingsContext = createContext<SettingsValue | undefined>(undefined);

function initializeSettings(): SettingsState {
  return loadSettings(window.localStorage);
}

export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettingsState] = useState(initializeSettings);

  useEffect(() => {
    saveSettings(window.localStorage, settings);
  }, [settings]);

  const setSettings = (update: SettingsUpdate): void => {
    setSettingsState((current) => updateSettings(current, update));
  };

  const value = useMemo(
    () => ({ settings, setSettings }),
    [settings],
  );

  return createElement(SettingsContext.Provider, { value }, children);
}

export function SettingsLocaleProvider({ children }: PropsWithChildren) {
  const { settings } = useSettings();
  return createElement(LocaleProvider, { language: settings.language }, children);
}

export function useSettings(): SettingsValue {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used inside SettingsProvider.");
  }
  return context;
}
