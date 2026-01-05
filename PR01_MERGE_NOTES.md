# PR-01 Freshness + Layered Seeds (Exploration/Depth)

## What this does
- Adds deterministic anti-repetition memory (Freshness) for macro picks.
- Splits zone RNG into layered streams: macro/meso/micro/mods/encounters/loot.
- Adds dev hotkeys for representative probeläufe:
  - SHIFT+N next zone
  - SHIFT+P previous zone
  - SHIFT+L log zone summary

## Config knobs
- data/config.json:
  - freshness.window
  - freshness.penaltyBase
  - debug.devHotkeys
  - debug.logZoneSummary

## Notes
- seedVersion bumped to 2 to reflect new generation pipeline.
- Waves are not removed, but exploration/depth is the intended mode.
