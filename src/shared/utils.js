export function html(strings, ...values) {
  return strings.reduce((out, str, i) => out + str + (values[i] ?? ""), "");
}

export function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function byId(id) {
  return document.getElementById(id);
}

export function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function truncate(value = "", length = 130) {
  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}

export function badgeClass(score) {
  if (score >= 78) return "good";
  if (score >= 55) return "warn";
  return "bad";
}

export function todayPlus(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
