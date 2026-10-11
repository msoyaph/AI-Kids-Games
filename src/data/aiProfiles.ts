import type { AiProfile, Personality } from './types';

export const AI_PROFILES: Record<Personality, AiProfile> = {
  balanced: { id: 'balanced', aggression: 0.35, itemEagerness: 0.55, defense: 0.5, shortcutBias: 1.0, lineNoise: 0.6, cornerRisk: 1.0 },
  aggressive: { id: 'aggressive', aggression: 0.8, itemEagerness: 0.85, defense: 0.25, shortcutBias: 1.15, lineNoise: 0.9, cornerRisk: 1.08 },
  careful: { id: 'careful', aggression: 0.1, itemEagerness: 0.4, defense: 0.8, shortcutBias: 0.55, lineNoise: 0.35, cornerRisk: 0.92 },
  itemFocused: { id: 'itemFocused', aggression: 0.45, itemEagerness: 0.7, defense: 0.65, shortcutBias: 0.8, lineNoise: 0.7, cornerRisk: 0.98 },
  showoff: { id: 'showoff', aggression: 0.4, itemEagerness: 0.6, defense: 0.3, shortcutBias: 1.4, lineNoise: 0.8, cornerRisk: 1.05 },
};
