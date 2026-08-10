/**
 * First-run (and replayable) spotlight onboarding.
 */

import { t } from "./i18n.js";

const PAD = 10;

/**
 * @typedef {{
 *   openSettings: (force?: boolean) => void,
 *   closeSettings: () => void,
 *   canCloseSettings: () => boolean,
 *   setSettingsSection?: (section: string) => void,
 *   goHome?: () => void,
 *   onFinish: (result: { skipped: boolean }) => void | Promise<void>,
 * }} TourHost
 */

/** @type {TourHost | null} */
let host = null;
let stepIndex = 0;
/** @type {HTMLElement | null} */
let root = null;
/** @type {ResizeObserver | null} */
let ro = null;

function steps() {
  return [
    {
      id: "welcome",
      selector: ".brand",
      settings: "any",
      title: t("tour.welcomeTitle"),
      body: t("tour.welcomeBody"),
    },
    {
      id: "settings",
      selector: "#btn-settings",
      settings: "closed",
      title: t("tour.settingsTitle"),
      body: t("tour.settingsBody"),
    },
    {
      id: "folder",
      selector: "#btn-choose-folder",
      settings: "open",
      section: "vault",
      title: t("tour.folderTitle"),
      body: t("tour.folderBody"),
    },
    {
      id: "language",
      selector: "#set-locale",
      settings: "open",
      section: "app",
      title: t("tour.languageTitle"),
      body: t("tour.languageBody"),
    },
    {
      id: "stats",
      selector: "#btn-stats",
      settings: "prefer-closed",
      title: t("tour.statsTitle"),
      body: t("tour.statsBody"),
    },
    {
      id: "update",
      selector: "#btn-update",
      settings: "prefer-closed",
      title: t("tour.updateTitle"),
      body: t("tour.updateBody"),
    },
  ];
}

function ensureRoot() {
  if (root) return root;
  root = document.createElement("div");
  root.id = "tour-root";
  root.className = "tour-root";
  root.hidden = true;
  root.innerHTML = `
    <div class="tour-shade" aria-hidden="true"></div>
    <div class="tour-hole" aria-hidden="true"></div>
    <div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div class="tour-meta"><span id="tour-step"></span></div>
      <h3 id="tour-title" class="tour-title"></h3>
      <p id="tour-body" class="tour-body"></p>
      <div class="tour-actions">
        <button type="button" class="btn soft" id="tour-skip"></button>
        <div class="tour-actions-right">
          <button type="button" class="btn soft" id="tour-back"></button>
          <button type="button" class="btn primary" id="tour-next"></button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  root.querySelector("#tour-skip")?.addEventListener("click", () => finish(true));
  root.querySelector("#tour-back")?.addEventListener("click", () => {
    if (stepIndex <= 0) return;
    stepIndex -= 1;
    renderStep();
  });
  root.querySelector("#tour-next")?.addEventListener("click", () => {
    if (stepIndex >= steps().length - 1) {
      finish(false);
      return;
    }
    stepIndex += 1;
    renderStep();
  });

  window.addEventListener("keydown", onKey);
  window.addEventListener("resize", onLayout);
  window.addEventListener("scroll", onLayout, true);
  return root;
}

function onKey(event) {
  if (!root || root.hidden) return;
  if (event.key === "Escape") {
    event.preventDefault();
    finish(true);
  } else if (event.key === "ArrowRight" || event.key === "Enter") {
    event.preventDefault();
    root.querySelector("#tour-next")?.dispatchEvent(new Event("click"));
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    root.querySelector("#tour-back")?.dispatchEvent(new Event("click"));
  }
}

function onLayout() {
  if (!root || root.hidden) return;
  positionHole();
}

/**
 * @param {boolean} skipped
 */
async function finish(skipped) {
  if (!root) return;
  root.hidden = true;
  document.body.classList.remove("tour-active");
  const hole = root.querySelector(".tour-hole");
  if (hole instanceof HTMLElement) {
    hole.style.width = "0";
    hole.style.height = "0";
  }
  ro?.disconnect();
  ro = null;
  const h = host;
  host = null;
  if (h) await h.onFinish({ skipped });
}

function applySettingsMode(mode, section) {
  if (!host) return;
  if (mode === "open") {
    if (section && typeof host.setSettingsSection === "function") {
      host.setSettingsSection(section);
    } else {
      host.openSettings(true);
    }
  } else if (mode === "closed" || mode === "prefer-closed") {
    if (host.canCloseSettings()) {
      if (typeof host.goHome === "function") host.goHome();
      else host.closeSettings();
    }
  }
}

function positionHole() {
  if (!root) return;
  const list = steps();
  const step = list[stepIndex];
  const hole = root.querySelector(".tour-hole");
  const card = root.querySelector(".tour-card");
  if (!(hole instanceof HTMLElement) || !(card instanceof HTMLElement) || !step) {
    return;
  }

  const el = document.querySelector(step.selector);
  if (!(el instanceof HTMLElement) || el.offsetParent === null && getComputedStyle(el).position === "static") {
    // Still try if visible via opacity; offsetParent null when hidden
  }
  if (!(el instanceof HTMLElement) || el.hidden || el.closest("[hidden]")) {
    hole.style.opacity = "0";
    card.style.top = "20vh";
    card.style.left = "50%";
    card.style.transform = "translateX(-50%)";
    return;
  }

  el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  const rect = el.getBoundingClientRect();
  const top = Math.max(8, rect.top - PAD);
  const left = Math.max(8, rect.left - PAD);
  const width = Math.min(window.innerWidth - left - 8, rect.width + PAD * 2);
  const height = Math.min(window.innerHeight - top - 8, rect.height + PAD * 2);

  hole.style.opacity = "1";
  hole.style.top = `${top}px`;
  hole.style.left = `${left}px`;
  hole.style.width = `${width}px`;
  hole.style.height = `${height}px`;

  const cardW = Math.min(360, window.innerWidth - 32);
  let cardTop = top + height + 16;
  let cardLeft = Math.min(left, window.innerWidth - cardW - 16);
  cardLeft = Math.max(16, cardLeft);

  if (cardTop + 220 > window.innerHeight) {
    cardTop = Math.max(16, top - 220);
  }
  if (cardTop < 16) cardTop = 16;

  card.style.width = `${cardW}px`;
  card.style.top = `${cardTop}px`;
  card.style.left = `${cardLeft}px`;
  card.style.transform = "none";
}

function renderStep() {
  if (!root || !host) return;
  const list = steps();
  const step = list[stepIndex];
  if (!step) return;

  applySettingsMode(step.settings, step.section);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => positionHole());
  });

  const stepEl = root.querySelector("#tour-step");
  const titleEl = root.querySelector("#tour-title");
  const bodyEl = root.querySelector("#tour-body");
  const skipEl = root.querySelector("#tour-skip");
  const backEl = root.querySelector("#tour-back");
  const nextEl = root.querySelector("#tour-next");

  if (stepEl) stepEl.textContent = t("tour.stepOf", { n: stepIndex + 1, total: list.length });
  if (titleEl) titleEl.textContent = step.title;
  if (bodyEl) bodyEl.textContent = step.body;
  if (skipEl) skipEl.textContent = t("tour.skip");
  if (backEl instanceof HTMLButtonElement) {
    backEl.textContent = t("tour.back");
    backEl.disabled = stepIndex === 0;
    backEl.hidden = stepIndex === 0;
  }
  if (nextEl) {
    nextEl.textContent =
      stepIndex >= list.length - 1 ? t("tour.done") : t("tour.next");
  }

  const target = document.querySelector(step.selector);
  ro?.disconnect();
  if (target instanceof HTMLElement && typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => positionHole());
    ro.observe(target);
  }
}

/**
 * @param {TourHost} tourHost
 */
export function startOnboarding(tourHost) {
  host = tourHost;
  stepIndex = 0;
  const el = ensureRoot();
  el.hidden = false;
  document.body.classList.add("tour-active");
  renderStep();
}

export function isOnboardingActive() {
  return Boolean(root && !root.hidden);
}
