// js/levels/11_v2_beats_5.js
// V2.5 = V2.4 + (5) hierarchical difficulty gene
console.log("✅ LOADED js/levels/11_v2_beats_5.js (V2.5)");

(function () {
  // =========================================================
  // 0) RUN META + METRICS LOGGER (shared, single source of truth)
  // =========================================================
  const RUNS_KEY = "mario_runs";
  const FILE_ID = "11_v2_beats_5";
  const GENERATOR_VERSION = "v2_beats_5";

  // Create once (do NOT overwrite when other experiment files load)
  if (!window.MARIO_METRICS) {
    window.MARIO_METRICS = {
      _getRuns() {
        try { return JSON.parse(localStorage.getItem(RUNS_KEY) || "[]"); }
        catch { return []; }
      },
      _setRuns(runs) {
        localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
      },
      clearAll() {
        localStorage.removeItem(RUNS_KEY);
        console.log("🧹 Cleared", RUNS_KEY);
      },
      exportAll() {
        const runs = this._getRuns();
        console.log("⬇️", RUNS_KEY, "=", runs);
        return runs;
      },
      _getEntityArray() {
        if (window.level && Array.isArray(window.level.entities)) return window.level.entities;
        if (window.level && Array.isArray(window.level.ents)) return window.level.ents;
        if (window.level && Array.isArray(window.level.objs)) return window.level.objs;
        if (Array.isArray(window.entities)) return window.entities;
        return null;
      },
      _computeMetrics() {
        const lvl = window.level;
        if (!lvl) return { ok: false, reason: "window.level not set" };

        let enemies = 0, blocks = 0, pipes = 0, floors = 0;
        let floorXs = [];

        const ents = this._getEntityArray();
        if (ents && ents.length) {
          for (const e of ents) {
            const name = (e && e.constructor && e.constructor.name) ? e.constructor.name : "";
            if (name === "Goomba" || name === "Koopa") enemies++;
            if (name === "Block") blocks++;
            if (name === "Pipe") pipes++;
            if (name === "Floor") {
              floors++;
              if (e.pos && typeof e.pos[0] === "number") floorXs.push(Math.floor(e.pos[0] / 16));
            }
          }
        } else {
          // Fallback: segment containers
          if (Array.isArray(lvl.floors) && lvl.floors.length) {
            for (const seg of lvl.floors) {
              if (seg && typeof seg.start === "number" && typeof seg.end === "number") {
                for (let x = seg.start; x <= seg.end; x++) floorXs.push(x);
              } else if (Array.isArray(seg) && seg.length === 2) {
                for (let x = seg[0]; x <= seg[1]; x++) floorXs.push(x);
              }
            }
            floors = floorXs.length;
          }
          if (Array.isArray(lvl.enemies)) enemies = lvl.enemies.length;
          if (Array.isArray(lvl.blocks)) blocks = lvl.blocks.length;
          if (Array.isArray(lvl.pipes)) pipes = lvl.pipes.length;
        }

        floorXs.sort((a, b) => a - b);
        let gaps = 0;
        for (let i = 1; i < floorXs.length; i++) {
          if (floorXs[i] > floorXs[i - 1] + 1) gaps++;
        }

        return { ok: true, floors, gaps, enemies, blocks, pipes };
      },
      logRun(note) {
        if (window.__MARIO_LOGGED_THIS_LOAD) return null;
        window.__MARIO_LOGGED_THIS_LOAD = true;

        const meta = window.MARIO_RUN_META || {};
        const m = this._computeMetrics();

        const entry = {
          timestamp: new Date().toISOString(),
          level_id: meta.level_id || "unknown",
          file_id: meta.file_id || "unknown",
          generator_version: meta.generator_version || "unknown",
          mode: meta.mode || "unknown",
          seed: (typeof meta.seed === "number") ? meta.seed : null,
          note: note || "auto",
          metrics: m.ok ? {
            floors: m.floors,
            gaps: m.gaps,
            enemies: m.enemies,
            blocks: m.blocks,
            pipes: m.pipes
          } : { error: m.reason }
        };

        const runs = this._getRuns();
        runs.push(entry);
        this._setRuns(runs);

        console.log("📊 Metrics logged:", entry);
        return entry;
      }
    };
  }

  function setSeedDisplay(seed) {
    const el = document.getElementById("seedDisplay");
    if (el) el.textContent = (seed == null ? "(none)" : String(seed));
  }

  // =========================================================
  // 1) Deterministic RNG + helpers
  // =========================================================
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function rint(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  // =========================================================
  // 2) Build (real gaps via segmented floors)
  // =========================================================
  function buildLevel(level, rng, evolve, seed) {
    const WIDTH = 212;
    const GY = 13;

    // difficulty gene: stable per seed unless overridden
    const D = (typeof window.MARIO_DIFFICULTY === "number")
      ? clamp(window.MARIO_DIFFICULTY, 0, 1)
      : clamp(rng(), 0, 1);

    const constraints = {
      maxGap: (D < 0.5 ? 4 : 5),
      maxEnemies: Math.round(8 + 10 * D),
      maxBricks: Math.round(60 + 40 * (1 - D)),
      minStartGround: 12,
      minLanding: 2
    };

    // Ground occupancy so "gaps" become real holes
    const ground = new Array(WIDTH).fill(true);

    // Enforce safe start
    for (let i = 0; i < constraints.minStartGround && i < WIDTH; i++) ground[i] = true;

    // Prevent enemy placement immediately after gaps
    const forbiddenEnemy = new Array(WIDTH).fill(false);
    function forbidLandingAfterGap(xStart, gapW) {
      for (let k = 0; k < constraints.minLanding; k++) {
        const lx = xStart + gapW + k;
        if (lx >= 0 && lx < WIDTH) forbiddenEnemy[lx] = true;
      }
    }
    function carveGap(atX, w) {
      w = Math.max(1, Math.min(constraints.maxGap, w));
      const xEnd = Math.min(WIDTH - 1 - constraints.minLanding, atX + w - 1);
      const realW = Math.max(0, xEnd - atX + 1);
      for (let x = atX; x <= xEnd; x++) ground[x] = false;
      forbidLandingAfterGap(atX, realW);
      return realW;
    }

    let enemies = 0;
    let bricks = 0;

    // Gap + enemy density scaled by D
    const gapCount = evolve ? Math.round(2 + 6 * D) : 2;
    const enemyBudget = evolve ? constraints.maxEnemies : 8;

    // Place a few pipes + enemies in “beats”
    for (let i = 0; i < 6; i++) {
      const baseX = 20 + i * 28;
      if (baseX >= WIDTH - 10) break;

      // Controlled pipes
      if ((evolve ? rng() < (0.55 + 0.25 * D) : rng() < 0.45)) {
        const h = rint(rng, 2, (D < 0.7 ? 3 : 4));
        const px = Math.min(WIDTH - 4, baseX);
        if (ground[px] && ground[px + 1]) level.putPipe(px, GY, h);

        // Enemy beat near pipe
        if (enemies < enemyBudget && rng() < (0.5 + 0.3 * D)) {
          const ex = Math.min(WIDTH - 3, px + 6);
          if (ground[ex] && !forbiddenEnemy[ex]) {
            level.putGoomba(ex, 12);
            enemies++;
          }
        }
      }

      // Bricks (more bricks when D is lower)
      const brickChance = evolve ? (0.35 + 0.35 * (1 - D)) : 0.45;
      if (bricks < constraints.maxBricks && rng() < brickChance) {
        const y = (D < 0.5 ? 5 : 6);
        const run = rint(rng, 5, 10);
        for (let k = 0; k < run && bricks < constraints.maxBricks; k++) {
          const bx = baseX + 6 + k;
          if (bx >= 0 && bx < WIDTH - 2) {
            level.putBrick(bx, y, null);
            bricks++;
          }
        }
      }

      // Walls (more vertical when D is higher)
      if (evolve && rng() < (0.25 + 0.45 * D)) {
        const wx = Math.min(WIDTH - 4, baseX + rint(rng, 10, 16));
        const h = rint(rng, 2, (D < 0.6 ? 4 : 6));
        for (let t = 1; t <= h; t++) level.putWall(wx, GY, t);
      }
    }

    // Gaps (REAL)
    for (let g = 0; g < gapCount; g++) {
      const gx = rint(rng, 30, 170);
      const w = rint(rng, 2, constraints.maxGap);
      const realW = carveGap(gx, w);

      // reward arc over gap
      if (rng() < 0.7) {
        for (let c = 0; c < Math.min(4, realW); c++) {
          const qx = gx + c;
          if (qx >= 0 && qx < WIDTH - 2) {
            level.putQBlock(qx, 7, new Mario.Bcoin([352, 112]));
          }
        }
      }
    }

    // Build segmented floors from occupancy
    let startSeg = null;
    for (let i = 0; i < WIDTH; i++) {
      if (ground[i] && startSeg == null) startSeg = i;
      if ((!ground[i] || i === WIDTH - 1) && startSeg != null) {
        const endSeg = (ground[i] && i === WIDTH - 1) ? i : i - 1;
        level.putFloor(startSeg, endSeg);
        startSeg = null;
      }
    }

    // Flag anchor
    level.putFlagpole(198);

    // Scenery lightweight
    level.putCloud(7, 3);
    level.putTwoCloud(36, 2);
    level.putThreeCloud(75, 3);
  }

  // =========================================================
  // 3) Public entry: Mario.oneone_v2_5(opts)
  // =========================================================
  Mario.oneone_v2_5 = function (opts) {
    opts = opts || {};

    // reset spam guard for this load
    window.__MARIO_LOGGED_THIS_LOAD = false;

    const evolve = !!opts.evolve;

    // seed policy (match v2.4 behavior: baseline has no seed; pcg has a seed)
    let seed;
    if (evolve) {
      seed = (typeof opts.seed === "number") ? (opts.seed | 0) : (Math.floor(Math.random() * 1e9) | 0);
      window.MARIO_SEED = seed;
      setSeedDisplay(seed);
    } else {
      seed = 0;
      window.MARIO_SEED = null;
      setSeedDisplay(null);
    }

    // run meta used by logger
    window.MARIO_RUN_META = {
      level_id: "1-1",
      file_id: FILE_ID,
      generator_version: GENERATOR_VERSION,
      mode: evolve ? "pcg" : "baseline",
      seed: evolve ? seed : null
    };

    const rng = mulberry32(seed || 123456789);

    level = new Mario.Level({
      playerPos: [56, 192],
      loader: Mario.oneone_v2_5,
      background: (evolve ? "#000000" : "#7974FF"),
      scrolling: true,
      invincibility: [144, 192, 240],
      exit: 204,

      floorSprite: new Mario.Sprite("sprites/tiles.png", [0, 0], [16, 16], 0),
      cloudSprite: new Mario.Sprite("sprites/tiles.png", [0, 320], [48, 32], 0),
      wallSprite: new Mario.Sprite("sprites/tiles.png", [0, 16], [16, 16], 0),
      brickSprite: new Mario.Sprite("sprites/tiles.png", [16, 0], [16, 16], 0),
      brickBounceSprite: new Mario.Sprite("sprites/tiles.png", [32, 0], [16, 16], 0),
      rubbleSprite: function () { return new Mario.Sprite("sprites/items.png", [64, 0], [8, 8], 3, [0, 1]); },
      ublockSprite: new Mario.Sprite("sprites/tiles.png", [48, 0], [16, 16], 0),
      superShroomSprite: new Mario.Sprite("sprites/items.png", [0, 0], [16, 16], 0),
      fireFlowerSprite: new Mario.Sprite("sprites/items.png", [0, 32], [16, 16], 20, [0, 1, 2, 3]),
      starSprite: new Mario.Sprite("sprites/items.png", [0, 48], [16, 16], 20, [0, 1, 2, 3]),
      pipeLEndSprite: new Mario.Sprite("sprites/tiles.png", [0, 128], [16, 16], 0),
      pipeREndSprite: new Mario.Sprite("sprites/tiles.png", [16, 128], [16, 16], 0),
      pipeLMidSprite: new Mario.Sprite("sprites/tiles.png", [0, 144], [16, 16], 0),
      pipeRMidSprite: new Mario.Sprite("sprites/tiles.png", [16, 144], [16, 16], 0),
      pipeUpMid: new Mario.Sprite("sprites/tiles.png", [0, 144], [32, 16], 0),
      pipeSideMid: new Mario.Sprite("sprites/tiles.png", [48, 128], [16, 32], 0),
      pipeLeft: new Mario.Sprite("sprites/tiles.png", [32, 128], [16, 32], 0),
      pipeTop: new Mario.Sprite("sprites/tiles.png", [0, 128], [32, 16], 0),
      qblockSprite: new Mario.Sprite("sprites/tiles.png", [384, 0], [16, 16], 8, [0, 0, 0, 0, 1, 2, 1]),
      bcoinSprite: function () { return new Mario.Sprite("sprites/items.png", [0, 112], [16, 16], 20, [0, 1, 2, 3]); },
      cloudSprites: [
        new Mario.Sprite("sprites/tiles.png", [0, 320], [16, 32], 0),
        new Mario.Sprite("sprites/tiles.png", [16, 320], [16, 32], 0),
        new Mario.Sprite("sprites/tiles.png", [32, 320], [16, 32], 0)
      ],
      hillSprites: [
        new Mario.Sprite("sprites/tiles.png", [128, 128], [16, 16], 0),
        new Mario.Sprite("sprites/tiles.png", [144, 128], [16, 16], 0),
        new Mario.Sprite("sprites/tiles.png", [160, 128], [16, 16], 0),
        new Mario.Sprite("sprites/tiles.png", [128, 144], [16, 16], 0),
        new Mario.Sprite("sprites/tiles.png", [144, 144], [16, 16], 0),
        new Mario.Sprite("sprites/tiles.png", [160, 144], [16, 16], 0)
      ],
      bushSprite: new Mario.Sprite("sprites/tiles.png", [176, 144], [48, 16], 0),
      bushSprites: [
        new Mario.Sprite("sprites/tiles.png", [176, 144], [16, 16], 0),
        new Mario.Sprite("sprites/tiles.png", [192, 144], [16, 16], 0),
        new Mario.Sprite("sprites/tiles.png", [208, 144], [16, 16], 0)
      ],
      goombaSprite: function () { return new Mario.Sprite("sprites/enemy.png", [0, 16], [16, 16], 3, [0, 1]); },
      koopaSprite: function () { return new Mario.Sprite("sprites/enemy.png", [96, 0], [16, 32], 2, [0, 1]); },
      flagPoleSprites: [
        new Mario.Sprite("sprites/tiles.png", [256, 128], [16, 16], 0),
        new Mario.Sprite("sprites/tiles.png", [256, 144], [16, 16], 0),
        new Mario.Sprite("sprites/items.png", [128, 32], [16, 16], 0)
      ]
    });

    // expose for logger
    window.level = level;

    player.pos[0] = level.playerPos[0];
    player.pos[1] = level.playerPos[1];
    vX = 0;

    buildLevel(level, rng, evolve, seed);

    music.underground.pause();
    music.overworld.play();

    // log ONCE (guarded)
    window.MARIO_METRICS.logRun("auto");
  };
})();
