const VIEWPORT_WIDTHS = [375, 768, 1280];
const SURFACE_SELECTORS = {
  draft: {
    overlay: ".draft-overlay",
    scroller: ".draft-card-list",
    wrap: ".draft-card__effect, .draft-card__warning, .draft-card__description",
  },
  shop: {
    overlay: ".shop-overlay:not(.shop-overlay--placing)",
    scroller: ".shop-grid",
    wrap:
      ".shop-card__effect, .shop-card > p:not(.shop-card__count), .shop-card__reason",
  },
};

function check(name, passed, details) {
  return { name, passed, details };
}

function visibleElements(selector, root = document) {
  return [...root.querySelectorAll(selector)].filter((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0
    );
  });
}

function viewportContains(rect) {
  const tolerance = 1;
  return (
    rect.left >= -tolerance &&
    rect.top >= -tolerance &&
    rect.right <= window.innerWidth + tolerance &&
    rect.bottom <= window.innerHeight + tolerance
  );
}

function targetSizeChecks(root) {
  const targets = visibleElements(
    "button:not(:disabled), [role='button'], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)",
    root,
  );
  const undersized = targets
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        label:
          element.getAttribute("aria-label") ??
          element.textContent?.trim().slice(0, 60) ??
          element.tagName,
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
      };
    })
    .filter(({ width, height }) => width < 44 || height < 44);
  return check(
    "interactive targets are at least 44px",
    targets.length > 0 && undersized.length === 0,
    { targetCount: targets.length, undersized },
  );
}

function longTextWrapCheck(selector, root) {
  const candidate = visibleElements(selector, root)[0];
  if (candidate === undefined) {
    return check("long choice text wraps", false, "No visible text probe target.");
  }
  const originalText = candidate.textContent;
  candidate.textContent =
    "긴 선택 효과 설명은 매우 좁은 화면에서도 가로 스크롤 없이 안전하게 여러 줄로 줄바꿈되어야 합니다 " +
    "long-unbroken-effect-token-that-must-wrap-within-the-card";
  const passed = candidate.scrollWidth <= candidate.clientWidth + 1;
  const details = {
    clientWidth: candidate.clientWidth,
    scrollWidth: candidate.scrollWidth,
    overflowWrap: getComputedStyle(candidate).overflowWrap,
  };
  candidate.textContent = originalText;
  return check("long choice text wraps", passed, details);
}

export function runPhase4bResponsiveQa({ surface, expectedWidth }) {
  if (!VIEWPORT_WIDTHS.includes(expectedWidth)) {
    throw new RangeError(`Expected one of ${VIEWPORT_WIDTHS.join(", ")}.`);
  }
  const selectors = SURFACE_SELECTORS[surface];
  if (selectors === undefined) {
    throw new RangeError(`Expected surface "draft" or "shop", received "${surface}".`);
  }
  const overlay = visibleElements(selectors.overlay)[0];
  if (overlay === undefined) {
    return {
      passed: false,
      surface,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      checks: [check(`${surface} overlay is visible`, false, selectors.overlay)],
    };
  }
  const scroller = visibleElements(selectors.scroller, overlay)[0];
  const overlayRect = overlay.getBoundingClientRect();
  const root = document.documentElement;
  const body = document.body;
  const scrollerStyle =
    scroller === undefined ? undefined : getComputedStyle(scroller);
  const checks = [
    check(
      "viewport width matches the CDP emulation",
      window.innerWidth === expectedWidth,
      { expected: expectedWidth, actual: window.innerWidth },
    ),
    check(
      "document has no horizontal scroll",
      root.scrollWidth <= root.clientWidth + 1 &&
        body.scrollWidth <= body.clientWidth + 1,
      {
        documentClientWidth: root.clientWidth,
        documentScrollWidth: root.scrollWidth,
        bodyClientWidth: body.clientWidth,
        bodyScrollWidth: body.scrollWidth,
      },
    ),
    check(
      `${surface} overlay stays inside the viewport`,
      viewportContains(overlayRect),
      {
        left: overlayRect.left,
        top: overlayRect.top,
        right: overlayRect.right,
        bottom: overlayRect.bottom,
      },
    ),
    check(
      `${surface} content fits or owns internal vertical scrolling`,
      scroller !== undefined &&
        (scroller.scrollHeight <= scroller.clientHeight + 1 ||
          scrollerStyle?.overflowY === "auto" ||
          scrollerStyle?.overflowY === "scroll"),
      scroller === undefined
        ? "Scroller is not visible."
        : {
            clientHeight: scroller.clientHeight,
            scrollHeight: scroller.scrollHeight,
            contentFits:
              scroller.scrollHeight <= scroller.clientHeight + 1,
            overflowY: scrollerStyle?.overflowY,
          },
    ),
    targetSizeChecks(overlay),
    longTextWrapCheck(selectors.wrap, overlay),
  ];
  if (expectedWidth === 375) {
    const overlayStyle = getComputedStyle(overlay);
    checks.push(
      check(
        `${surface} escapes the compressed run stage on phones`,
        overlayStyle.position === "fixed" &&
          Math.abs(overlayRect.left) <= 1 &&
          Math.abs(overlayRect.top) <= 1 &&
          Math.abs(overlayRect.width - window.innerWidth) <= 1 &&
          Math.abs(overlayRect.height - window.innerHeight) <= 1,
        {
          position: overlayStyle.position,
          width: overlayRect.width,
          height: overlayRect.height,
        },
      ),
    );
  }
  return {
    passed: checks.every(({ passed }) => passed),
    surface,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    checks,
  };
}

export const PHASE4B_RESPONSIVE_QA_MATRIX = {
  widths: VIEWPORT_WIDTHS,
  surfaces: Object.keys(SURFACE_SELECTORS),
  usage:
    "Use Chrome CDP to set each width, open the named overlay, then call runPhase4bResponsiveQa({ surface, expectedWidth }).",
};
