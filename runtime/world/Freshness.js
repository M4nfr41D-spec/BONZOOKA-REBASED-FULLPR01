// Copyright (c) Manfred Foissner. All rights reserved.
// License: See LICENSE.txt in the project root.

// ============================================================
// Freshness.js - Anti-Repetition Memory for Procedural Picks
// ============================================================
// Player goal: "no world feels predictable"
// Engineering goal: deterministic, reproducible, save-persisted variety.

export const Freshness = {
  // Ensure freshness structure exists on meta
  ensure(meta, cfg = {}) {
    if (!meta.freshness || typeof meta.freshness !== 'object') {
      meta.freshness = { window: cfg.window ?? 8, recent: [] };
    }
    if (typeof meta.freshness.window !== 'number') meta.freshness.window = cfg.window ?? 8;
    if (!Array.isArray(meta.freshness.recent)) meta.freshness.recent = [];

    // Keep bounded
    const w = Math.max(1, Math.floor(meta.freshness.window || 8));
    meta.freshness.window = w;
    meta.freshness.recent = meta.freshness.recent.slice(-w);
    return meta.freshness;
  },

  countRecent(meta, key) {
    const rec = meta?.freshness?.recent;
    if (!Array.isArray(rec) || !key) return 0;
    let c = 0;
    for (let i = rec.length - 1; i >= 0; i--) {
      if (rec[i] === key) c++;
    }
    return c;
  },

  // Weight penalty for repetition
  penalizeWeight(weight, countRecent, penaltyBase) {
    const base = (typeof penaltyBase === 'number' && penaltyBase > 0 && penaltyBase < 1) ? penaltyBase : 0.25;
    if (!countRecent) return weight;
    return weight * Math.pow(base, countRecent);
  },

  // Weighted pick with freshness penalty.
  // options: [{ value:any, weight:number }]
  pick(rng, options, keyFn, meta, cfg = {}) {
    const penaltyBase = cfg.penaltyBase ?? 0.25;
    if (!Array.isArray(options) || options.length === 0) return null;

    // Build penalized weights
    let total = 0;
    const tmp = options.map(o => {
      const key = keyFn ? String(keyFn(o.value)) : String(o.value);
      const count = this.countRecent(meta, key);
      const w = this.penalizeWeight(Math.max(0, o.weight ?? 1), count, penaltyBase);
      total += w;
      return { value: o.value, key, w };
    });

    // Fallback if all weights became 0
    if (total <= 0) {
      const any = options[Math.floor((rng?.next?.() ?? Math.random()) * options.length)];
      return { value: any.value, key: keyFn ? String(keyFn(any.value)) : String(any.value) };
    }

    // Deterministic weighted selection
    let r = (rng?.next?.() ?? Math.random()) * total;
    for (const t of tmp) {
      r -= t.w;
      if (r <= 0) return { value: t.value, key: t.key };
    }
    const last = tmp[tmp.length - 1];
    return { value: last.value, key: last.key };
  },

  push(meta, key) {
    if (!meta?.freshness || !key) return;
    meta.freshness.recent.push(String(key));
    const w = Math.max(1, Math.floor(meta.freshness.window || 8));
    meta.freshness.recent = meta.freshness.recent.slice(-w);
  }
};

export default Freshness;
