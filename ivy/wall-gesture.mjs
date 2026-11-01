// Downward pull is a slingshot: pull right to launch left. Angle selects direction; displacement length selects power.
export function pullAim(dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || dy <= 0 || Math.hypot(dx, dy) < 10) return 0;
  return Math.max(-1, Math.min(1, Math.atan2(-dx, dy) / (Math.PI / 3))) || 0;
}
export function cuePosition(x, y, width, height) {
  // The label sits above the finger, and stays readable at every viewport edge.
  return {x: Math.max(86, Math.min(width - 86, x)), y: Math.max(38, Math.min(height - 38, y - 72))};
}

// Screen-space displacement, not accumulated path length. Retraction reduces force.
export function pullPower(dx, dy, height=750) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || dy <= 0) return 0;
  const fullPull=Math.max(90,Math.min(160,height*.22));
  return Math.max(0,Math.min(1,(Math.hypot(dx,dy)-10)/(fullPull-10)));
}
