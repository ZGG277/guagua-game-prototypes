/** Whole catches unlock difficulty; attempts, time and demonstrations do not. */
export const DIFFICULTY_THRESHOLDS = Object.freeze([0, 3, 7, 12, 18]);

export const DIFFICULTY_PROFILES = Object.freeze([
  {label: '起步练习', landingRadius: 14, fruitGravity: 600, restSeconds: 3},
  {label: '小幅换位', landingRadius: 35, fruitGravity: 600, restSeconds: 3},
  {label: '左右判断', landingRadius: 70, fruitGravity: 600, restSeconds: 3},
  {label: '落果加速', landingRadius: 70, fruitGravity: 630, restSeconds: 3},
  {label: '连采挑战', landingRadius: 70, fruitGravity: 630, restSeconds: 3},
].map((profile, level) => Object.freeze({
  level, ...profile, timingAssistFloor: 1.72, timingBuffer: .4,
})));

const MAX_LEVEL = DIFFICULTY_PROFILES.length - 1;
const RECOVERY_WHOLE = 3;
const FALLBACK_MISSES = 3;

/**
 * Record each completed fruit exactly once, using the round's immutable demo
 * flag. A whole catch is the only success; pulp and smashed are failed whole
 * catches. Null, running and unknown outcomes are ignored.
 *
 * Three consecutive failures lower one level. Its replacement promotion gate
 * requires three NEW whole catches, even when old totals cleared that level.
 * Those recovery catches need not be consecutive. Each further promotion also
 * needs at least three new whole catches, so a large old total cannot skip or
 * rapidly regain several levels. A failure at level zero never raises its gate.
 *
 * No clock, interval, hidden-page handler or simulation state lives here. The
 * caller owns round completion and applies the returned profile next round.
 */
export class DifficultyController {
  #level = 0;
  #totalWhole = 0;
  #consecutiveMisses = 0;
  #nextPromotionWhole = DIFFICULTY_THRESHOLDS[1];

  get profile() { return DIFFICULTY_PROFILES[this.#level]; }

  get status() {
    return Object.freeze({
      level: this.#level,
      totalWhole: this.#totalWhole,
      consecutiveMisses: this.#consecutiveMisses,
      nextPromotionWhole: this.#nextPromotionWhole,
      wholeToNextLevel: this.#nextPromotionWhole === null
        ? 0 : Math.max(0, this.#nextPromotionWhole - this.#totalWhole),
    });
  }

  reset() {
    this.#level = 0;
    this.#totalWhole = 0;
    this.#consecutiveMisses = 0;
    this.#nextPromotionWhole = DIFFICULTY_THRESHOLDS[1];
    return this.status;
  }

  record(outcome, {demo = false} = {}) {
    if (demo || !['whole', 'pulp', 'smashed'].includes(outcome)) return this.status;

    if (outcome === 'whole') {
      this.#totalWhole++;
      this.#consecutiveMisses = 0;
      if (this.#level < MAX_LEVEL && this.#totalWhole >= this.#nextPromotionWhole) {
        this.#level++;
        this.#nextPromotionWhole = this.#level === MAX_LEVEL ? null : Math.max(
          DIFFICULTY_THRESHOLDS[this.#level + 1],
          this.#totalWhole + RECOVERY_WHOLE,
        );
      }
    } else {
      this.#consecutiveMisses++;
      if (this.#consecutiveMisses === FALLBACK_MISSES) {
        this.#consecutiveMisses = 0;
        if (this.#level > 0) {
          this.#level--;
          this.#nextPromotionWhole = Math.max(
            DIFFICULTY_THRESHOLDS[this.#level + 1],
            this.#totalWhole + RECOVERY_WHOLE,
          );
        }
      }
    }
    return this.status;
  }
}
