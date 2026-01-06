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
};

// Global access
window.Game = Game;

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => Game.init());
