function readInitialSpritesEnabled(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("sprites") !== "off";
}

const browserSpritesEnabled = readInitialSpritesEnabled();

export function readSpritesEnabled(): boolean {
  return browserSpritesEnabled;
}

export function readDevicePixelRatio(): number {
  if (typeof window === "undefined") {
    return 1;
  }

  return window.devicePixelRatio;
}
