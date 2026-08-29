import * as Haptics from 'expo-haptics';

export type KineticSlideId = 'time' | 'book' | 'discover';

export type KineticLayout = {
  screenWidth: number;
  contentWidth: number;
  compact: boolean;
  visualHeight: number;
};

export const KINETIC_MOTION = {
  sceneEntranceMs: 440,
  flipMs: 380,
  pressInMs: 90,
  pressScale: 0.976,
  pressDepth: 2,
  dateStaggerMs: 55,
  proofStaggerMs: 70,
  spring: {
    stiffness: 260,
    damping: 24,
    mass: 0.9,
  },
} as const;

const quietly = (promise: Promise<void>) => {
  promise.catch(() => {
    // Haptics are enhancement-only. The OS can decline them in low-power mode
    // or when the user has disabled system haptics.
  });
};

export const kineticHaptics = {
  impact: () => {
    if (typeof Haptics.impactAsync !== 'function') return;
    quietly(Haptics.impactAsync(Haptics.ImpactFeedbackStyle?.Light));
  },
  select: () => {
    if (typeof Haptics.selectionAsync !== 'function') return;
    quietly(Haptics.selectionAsync());
  },
};
