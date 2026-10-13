/** Every balance number in one place. The bot simulation (npm run sim) reports what they do. */
export const TUNING = {
  score: {
    perCell: 1,
    /** Line points before the streak: base·L(L+1)/2 → 10, 30, 60, 100, 150, 210 for 1–6 lines. */
    lineBase: 10,
    /** A streak of s clearing moves multiplies line points by (2 + min(s−1, maxStep)) / 2: ×1 … ×4. */
    maxStep: 6,
    /** The streak ends after this many moves in a row without a clear. */
    dryLimit: 3,
    boardClear: 300,
  },
  dealer: {
    /** Tier weights (small, medium, big). */
    easy: [50, 42, 8] as const,
    normalStart: [50, 40, 10] as const,
    normalEnd: [20, 44, 36] as const,
    /** Pressure P = clamp((score − from) / span, 0, 1). */
    pressureFrom: 1000,
    pressureSpan: 9000,
    /** Chance of a "hard set" (at least two big pieces) is hardSet·P. */
    hardSet: 0.35,
    /** Warm-up: at score s below this, a Normal tray is built to fit (with Normal's piece mix) with chance 1 − s/warmup. */
    warmup: 2000,
    /** While the board is open (a free 3×3 and this many empty cells), Normal trays are fully placeable. */
    openBase: 16,
    openPressure: 14,
    /** Above this score the open threshold rises one cell per `tightenEvery` points, so even perfect play ends. */
    tightenFrom: 10000,
    tightenEvery: 500,
    /** Random draws on Normal before building a placeable tray instead (one fewer every `drawEvery` points past `tightenFrom`). */
    draws: 8,
    drawEvery: 1000,
    /** When building a tray, how often a piece goes where it clears the most lines. */
    kindPlacement: 0.6,
    /** Fit tests per solvability check and per deal: a fixed operation budget, not time, so every device deals the same. */
    checkBudget: 40000,
    dealBudget: 160000,
    /** Family weights inside a tier (orientations share their family's weight). */
    family: { dot: 1, i2: 1.2, i3: 1.2, c3: 1.2, i4: 1, o2: 1, l4: 1.3, t4: 1, s4: 0.9, i5: 0.9, c5: 1, r6: 1, o3: 0.8 } as Record<string, number>,
  },
  helpers: {
    start: { undo: 2, shuffle: 1, single: 2 },
    cap: 5,
    /** Continues offered per Classic game. */
    continues: 2,
    classicPointsPerHelper: 2500,
  },
  /** Number of block colors in every theme. */
  colors: 6,
} as const;
