// Copyright (c) Manfred Foissner. All rights reserved.
// License: See LICENSE.txt in the project root.

// ============================================================
// MAIN.js - BONZOOKAA Exploration Mode
// ============================================================
// Diablo-style exploration with hub, acts, and boss portals

import { State, resetRun, resetPlayer } from './runtime/State.js';
import { loadAllData } from './runtime/DataLoader.js';
import { Save } from './runtime/Save.js';
import { Stats } from './runtime/Stats.js';
import { Leveling } from './runtime/Leveling.js';
import { Items } from './runtime/Items.js';
import { Player } from './runtime/Player.js';
import { Enemies } from './runtime/Enemies.js';
import { Bullets } from './runtime/Bullets.js';
import { Pickups } from './runtime/Pickups.js';
import { Particles } from './runtime/Particles.js';
import { Input } from './runtime/Input.js';
import { UI } from './runtime/UI.js';

// World System
import { Camera } from './runtime/world/Camera.js';
import { World } from './runtime/world/World.js';
import { SceneManager } from './runtime/world/SceneManager.js';
import { SeededRandom } from './runtime/world/SeededRandom.js';

// ============================================================
// GAME CONTROLLER
// ============================================================

const Game = {
  canvas: null,
  ctx: null,
  lastTime: 0,
  
  // Screen dimensions
  screenW: 800,
  screenH: 600,
  
  // Game mode
  mode: 'exploration', // 'exploration' or 'waves' (legacy)
  
  // ========== INITIALIZATION ==========
  
  async init() {
    console.log('🚀 BONZOOKAA Exploration Mode initializing...');
    console.log('BONZOOKAA BUILD v4.0.3-uiwirefix');
    
    // Setup canvas
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    // Load data
    await loadAllData();
    
    // Load save
    Save.load();
    
    // Register modules in State for cross-module access
    State.modules = {
      Save, Stats, Leveling, Items, Player, 
      Enemies, Bullets, Pickups, Particles, UI,
      Camera, World, SceneManager
    };
    
    // Initialize systems
    Input.init(this.canvas);
    UI.init();
    Camera.init(0, 0);
    SceneManager.init();
    
    // Calculate stats
    Stats.calculate();
    
    // Add starter items if new
    if (State.meta.stash.length === 0) {
      this.addStarterItems();
    }
    
    // Initialize act unlocks
    this.initActUnlocks();
    
    // Show hub
    this.showHub();
    
    // Start loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
    
    console.log('✅ Exploration mode ready');
  },
  
  resize() {
    const container = document.getElementById('gameContainer');
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.screenW = this.canvas.width;
    this.screenH = this.canvas.height;
  },
  // ========== MAIN LOOP ==========
  loop(t) {
    const now = t;
    const dt = Math.min(0.05, (now - (this.lastTime || now)) / 1000);
    this.lastTime = now;

    this.update(dt);
    this.draw();

    requestAnimationFrame((tt) => this.loop(tt));
  },

  update(dt) {
    // Update scene transitions regardless of scene
    SceneManager.updateTransition?.(dt);

    const scene = SceneManager.getScene?.() || State.scene;
    if (scene === 'combat' || scene === 'loading') {
      // Systems update
      Camera.update?.(dt, this.screenW, this.screenH);
      World.update?.(dt, this.canvas);
      Player.update?.(dt, this.canvas, true);
      Enemies.update?.(dt, this.canvas);
      Bullets.update?.(dt, this.canvas);
      Pickups.update?.(dt, this.canvas);
      Particles.update?.(dt, this.canvas);
    }
  },

  draw() {
    const ctx = this.ctx;
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, this.screenW, this.screenH);

    const scene = SceneManager.getScene?.() || State.scene;
    if (scene === 'combat' || scene === 'loading') {
      World.draw?.(ctx, this.screenW, this.screenH);
      Pickups.draw?.(ctx);
      Enemies.draw?.(ctx);
      Bullets.draw?.(ctx);
      Player.draw?.(ctx);
      Particles.draw?.(ctx);
    }

    // Transition overlay
    SceneManager.drawTransition?.(ctx, this.screenW, this.screenH);
  },

  
  addStarterItems() {
    const starterWeapon = Items.generate('laser_cannon', 'common');
    const starterShield = Items.generate('energy_barrier', 'common');
    const starterEngine = Items.generate('ion_thruster', 'common');
    
    if (starterWeapon) Items.addToStash(starterWeapon);
    if (starterShield) Items.addToStash(starterShield);
    if (starterEngine) Items.addToStash(starterEngine);
    
    if (starterWeapon) Items.equip(starterWeapon.id);
    if (starterShield) Items.equip(starterShield.id);
    if (starterEngine) Items.equip(starterEngine.id);
    
    Stats.calculate();
    Save.save();
    UI.renderAll();
  },
  
  initActUnlocks() {
    // Normalize legacy save shapes (array -> object)
    if (Array.isArray(State.meta.actsUnlocked)) {
      const arr = State.meta.actsUnlocked;
      State.meta.actsUnlocked = {};
      for (const id of arr) State.meta.actsUnlocked[id] = true;
    }
    if (Array.isArray(State.meta.actsCompleted)) {
      const arr = State.meta.actsCompleted;
      State.meta.actsCompleted = {};
      for (const id of arr) State.meta.actsCompleted[id] = true;
    }
    // Ensure act unlock state exists
    if (!State.meta.actsUnlocked || typeof State.meta.actsUnlocked !== 'object') {
      State.meta.actsUnlocked = { act1: true };
    }
    // Sync with acts.json unlocked flags
    const acts = State.data.acts;
    if (acts) {
      for (const [actId, actData] of Object.entries(acts)) {
        if (actData.unlocked && !State.meta.actsUnlocked[actId]) {
          State.meta.actsUnlocked[actId] = true;
        }
      }
    }
  }

  // ========== UI / FLOW (wired to index.html onclick handlers) ==========
  showHub() {
    // Hub is DOM-driven; just ensure correct visibility/state
    SceneManager.currentScene = 'hub';
    State.scene = 'hub';
    State.run.inCombat = false;
    SceneManager.showHubUI?.();
    UI.renderAll?.();
  },

  start() {
    // Start first unlocked act (default act1)
    this.initActUnlocks();
    const unlocked = State.meta.actsUnlocked || {};
    const actId = unlocked.act1 ? 'act1' : (Object.keys(unlocked)[0] || 'act1');
    SceneManager.startAct?.(actId);
  },

  toHub() {
    SceneManager.goToHub?.();
  },

  restart() {
    // 'Try again' from death screen: restart current act
    const modal = document.getElementById('deathModal');
    if (modal) modal.classList.remove('show');
    this.initActUnlocks();
    const actId = State.run.currentAct || (State.meta.actsUnlocked?.act1 ? 'act1' : (Object.keys(State.meta.actsUnlocked || {})[0] || 'act1'));
    SceneManager.startAct?.(actId);
  },

  closeVendor() {
    const modal = document.getElementById('vendorModal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.style.display = 'none';
  },

  debugAddItems() {
    // Add a small pack of items for quick testing
    const ids = Object.keys(State.data.items || {});
    if (ids.length === 0) return;
    const rarities = Object.keys(State.data.rarities || {});
    for (let i = 0; i < 5; i++) {
      const baseId = ids[(Math.random() * ids.length) | 0];
      const rarity = rarities[(Math.random() * rarities.length) | 0] || 'common';
      const item = Items.generate(baseId, rarity);
      if (item) Items.addToStash(item);
    }
    Stats.calculate();
    Save.save();
    UI.renderAll();
  },

  debugAddResources() {
    State.meta.scrap = (State.meta.scrap || 0) + 5000;
    State.run.cells = (State.run.cells || 0) + 250;
    Save.save();
    UI.renderAll();
  },

  debugUnlockAll() {
    const acts = Object.keys(State.data.acts || {});
    State.meta.actsUnlocked = {};
    for (const a of acts) State.meta.actsUnlocked[a] = true;
    Save.save();
    UI.renderAll();
  },
};

// Global access
window.Game = Game;

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => Game.init());
