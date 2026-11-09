// Visible hand/cloth preparation is independent from the catch-assist gate.
// It never creates a contact, latch, score or an early circleStart.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
export function preparationLift(age, held) {
  if (age < 0) return 0;
  const rise = 1 - Math.exp(-age / .026);
  return rise * (held ? 1 : 1 - smooth((age - .16) / .2));
}
export function responseHand(time, start, alignment, held, releasedAt = null) {
  const lift = start === null ? 0 : preparationLift(time - start, held) * (releasedAt === null ? 1 : 1 - smooth((time - releasedAt) / .2));
  return {x:315 + alignment + 14 * lift, y:450 - 30 * lift};
}
export function blendCastFromPreparation(hand, age, preparation) {
  const remaining = 1 - smooth(age / .12);
  return {x:hand.x + 14 * preparation * remaining, y:hand.y - 30 * preparation * remaining};
}
