/**
 * FNV-1a 32-bit hash. Deterministic, no external deps.
 */
export function fnv1a32(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * Mulberry32 PRNG seeded from a 32-bit integer.
 * Returns a function that yields floats in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

/** Hash string to float in [0, 1). */
export function hashFloat(str: string): number {
  return mulberry32(fnv1a32(str))();
}

/** Hash string to integer in [0, max). */
export function hashInt(str: string, max: number): number {
  return Math.floor(hashFloat(str) * max);
}
