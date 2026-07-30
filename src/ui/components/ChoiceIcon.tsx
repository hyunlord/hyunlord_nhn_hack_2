import type { ChoiceIconName } from "../choicePresentation/choiceVisuals";

export function ChoiceIcon({
  label,
  name,
}: {
  readonly label?: string;
  readonly name: ChoiceIconName;
}) {
  const accessibility =
    label === undefined
      ? { "aria-hidden": true as const }
      : { "aria-label": label, role: "img" as const };

  return (
    <svg
      {...accessibility}
      className={`choice-icon choice-icon--${name}`}
      viewBox="0 0 48 48"
    >
      {iconPaths(name)}
    </svg>
  );
}

function iconPaths(name: ChoiceIconName) {
  switch (name) {
    case "attack":
      return (
        <>
          <path d="m10 8 25 25m3-23L13 35m18-29 7 4-4 7M6 31l7 7m22-7-7 7" />
          <path d="m8 40 8-3-5-5-3 8Z" />
        </>
      );
    case "defense":
      return <path d="M24 5 39 11v11c0 10-6 17-15 21C15 39 9 32 9 22V11l15-6Zm0 8v20" />;
    case "divine":
      return <path d="m27 4-15 23h11l-2 17 15-25H25l2-15Z" />;
    case "healing":
      return <path d="M24 41S7 31 7 18c0-9 11-13 17-5 6-8 17-4 17 5 0 13-17 23-17 23Zm-2-20v10m-5-5h10" />;
    case "mobility":
      return (
        <>
          <path d="M15 7c7 7 10 14 9 21 6 0 11 3 15 8-10 6-21 6-31-1 5-5 8-11 7-18V7Z" />
          <path d="M11 30c7 4 15 6 24 4" />
        </>
      );
    case "population":
      return (
        <>
          <circle cx="18" cy="17" r="6" />
          <circle cx="32" cy="19" r="5" />
          <path d="M7 40c1-9 5-13 11-13s10 4 11 13M27 29c8-1 12 3 13 11" />
        </>
      );
    case "tribute":
      return (
        <>
          <circle cx="24" cy="24" r="17" />
          <path d="M29 16h-8a5 5 0 0 0 0 10h6a5 5 0 0 1 0 10h-9m6-25v30" />
        </>
      );
    case "warning":
      return (
        <>
          <path d="M24 6 43 40H5L24 6Z" />
          <path d="M24 17v11m0 6v1" />
        </>
      );
  }
}
