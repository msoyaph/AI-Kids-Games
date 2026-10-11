import type { QualityTier } from '../systems/quality';

/** URL flags: ?fps (meter), ?debug (test hooks), ?stress (perf runs: the governor never adapts), ?q=low|medium|high (force tier). */
function params(): URLSearchParams {
  try {
    return new URLSearchParams(location.search);
  } catch {
    return new URLSearchParams();
  }
}

const p = params();
const q = p.get('q');

export const FLAGS = {
  fps: p.has('fps'),
  debug: p.has('debug'),
  stress: p.has('stress'),
  gallery: p.has('gallery'),
  rockets: p.has('rockets'),
  chars: p.has('chars'),
  props: p.has('props'),
  academy: p.has('academy'),
  quality: (q === 'low' || q === 'medium' || q === 'high' ? q : null) as QualityTier | null,
};
