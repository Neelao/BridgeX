import { seed } from "./data.js";

const KEY = "bridgex_state_v11";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function loadState() {
  const saved = localStorage.getItem(KEY);
  if (saved) return JSON.parse(saved);
  const seeded = clone(seed);
  localStorage.setItem(KEY, JSON.stringify(seeded));
  return seeded;
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.setItem(KEY, JSON.stringify(seed));
  return loadState();
}

export function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
