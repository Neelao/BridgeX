import { seed } from "./data.js";
import { apiSaveState } from "./api.js";

const KEY = "bridgex_state_v17";

function clone(v) { return JSON.parse(JSON.stringify(v)); }

export function ensureDemoState(state) {
  const next = state && typeof state === "object" ? clone(state) : clone(seed);

  ["users", "opportunities", "candidates", "applications", "meetings"].forEach((key) => {
    if (!Array.isArray(next[key])) next[key] = [];
  });

  ["users", "opportunities", "candidates", "applications"].forEach((key) => {
    const existingById = new Map(next[key].map((item) => [item.id, item]));
    seed[key].forEach((demoItem) => {
      const existing = existingById.get(demoItem.id);
      if (existing) {
        Object.assign(existing, clone(demoItem));
      } else {
        next[key].push(clone(demoItem));
      }
    });
  });

  return next;
}

export function loadState() {
  const saved = localStorage.getItem(KEY);
  if (saved) {
    const restored = ensureDemoState(JSON.parse(saved));
    localStorage.setItem(KEY, JSON.stringify(restored));
    return restored;
  }
  const seeded = ensureDemoState(seed);
  localStorage.setItem(KEY, JSON.stringify(seeded));
  return seeded;
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
  apiSaveState(state); // fire-and-forget to server
}

export function resetState() {
  localStorage.setItem(KEY, JSON.stringify(seed));
  return loadState();
}

export function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
