// js/levels/11_v2_beats_4.js
// V2.4 = (1) beat genome + (2) mutation + (3) crossover + (4) schema preservation
// Uses the SAME logging system/key as 11_v2_beats.js so plots can compare across experiments.
console.log("✅ LOADED js/levels/11_v2_beats_4.js (V2.4)");

(function () {
  // =========================================================
  // 0) RUN META + METRICS LOGGER (shared, single source of truth)
  // =========================================================
  const RUNS_KEY = "mario_runs";
  const FILE_ID = "11_v2_beats_4";
  const GENERATOR_VERSION = "v2_beats_4";

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
        // Prevent accidental spam logging (e.g., repeated starts / double-calls)
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
  // 1) Deterministic RNG
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
  function choice(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  // =========================================================
  // 2) Constraints (keep it playable)
  // =========================================================
  const CONSTRAINTS = {
    MAX_GAP: 4,
    MIN_LANDING: 2,
    MIN_START_GROUND: 12,
    MAX_ENEMIES: 10,
    MAX_BRICKS: 70
  };

  // =========================================================
  // 3) Beat genome with schema preservation
  // =========================================================
  // Protected schema beats (cannot be deleted or renamed; only mild param tweaks)
  const SCHEMA_BEATS = ["schema:pipe_goomba", "schema:coin_arc_gap", "schema:stair_to_flag"];

  function makeBaseGenome() {
    return [
      { len: 22, feature: "flat_intro" },
      { len: 24, feature: "schema:pipe_goomba" },
      { len: 26, feature: "schema:coin_arc_gap" },
      { len: 24, feature: "platforms" },
      { len: 28, feature: "schema:pipe_goomba" },
      { len: 26, feature: "hills_blocks" },
      { len: 22, feature: "gaps" },
      { len: 28, feature: "schema:stair_to_flag" }
    ];
  }

  function crossover(rng, a, b) {
    const cut = rint(rng, 1, Math.min(a.length, b.length) - 2);
    return a.slice(0, cut).concat(b.slice(cut));
  }

  function mutateGenome(rng, g) {
    const out = g.map(x => ({ ...x }));

    for (let i = 0; i < out.length; i++) {
      // Length tweaks are allowed for any beat (including schema)
      if (rng() < 0.20) out[i].len = Math.max(14, Math.min(34, out[i].len + rint(rng, -4, 4)));

      // Feature swaps ONLY for non-schema beats (schema preservation technique)
      const isSchema = String(out[i].feature).startsWith("schema:");
      if (!isSchema && rng() < 0.12) {
        out[i].feature = choice(rng, ["flat_intro", "platforms", "hills_blocks", "gaps"]);
      }
    }

    // Ensure schemas are still present at least once (hard safety)
    for (const s of SCHEMA_BEATS) {
      if (!out.some(b => b.feature === s)) {
        out.push({ len: 24, feature: s });
      }
    }
    return out;
  }

  // =========================================================
  // 4) Compile beats into a build (segment floors so gaps are real)
  // =========================================================
  function compileAndBuild(level, genome, rng, widthTiles) {
    const GY = 13;
    const END_X = widthTiles;

    // Occupancy grid so gaps are real
    const ground = new Array(widthTiles).fill(true);
    const forbiddenEnemy = new Array(widthTiles).fill(false);

    // Enforce safe start
    for (let i = 0; i < CONSTRAINTS.MIN_START_GROUND && i < widthTiles; i++) ground[i] = true;

    // Counts (for limiting placement)
    let enemies = 0;
    let bricks = 0;

    function forbidLandingAfterGap(xStart, gapW) {
      for (let k = 0; k < CONSTRAINTS.MIN_LANDING; k++) {
        const lx = xStart + gapW + k;
        if (lx >= 0 && lx < widthTiles) forbiddenEnemy[lx] = true;
      }
    }

    function carveGap(atX, w) {
      w = Math.max(1, Math.min(CONSTRAINTS.MAX_GAP, w));
      const xEnd = Math.min(widthTiles - 1 - CONSTRAINTS.MIN_LANDING, atX + w - 1);
      const realW = Math.max(0, xEnd - atX + 1);
      for (let x = atX; x <= xEnd; x++) ground[x] = false;
      forbidLandingAfterGap(atX, realW);
      return realW;
    }

    let x = 0;
    const safeEndReserve = 24; // keep room for stairs/flag area
    const maxXForBeats = END_X - safeEndReserve;

    for (let i = 0; i < genome.length; i++) {
      const beat = genome[i];
      const len = beat.len | 0;
      const start = x;
      const end = Math.min(maxXForBeats, x + len);
      const feature = String(beat.feature);

      // -------- non-schema beats --------
      if (feature === "flat_intro") {
        if (rng() < 0.7) level.putCloud(7, 3);
        if (rng() < 0.4) level.putTwoCloud(36, 2);
        if (rng() < 0.4) level.putThreeCloud(75, 3);

        if (rng() < 0.7) {
          const rx = Math.min(maxXForBeats - 2, start + 10);
          if (ground[rx]) level.putQBlock(rx, 9, new Mario.Bcoin([rx * 16, 144]));
        }
      }

      if (feature === "platforms") {
        const y = 5;
        const count = rint(rng, 6, 10);
        for (let k = 0; k < count && bricks < CONSTRAINTS.MAX_BRICKS; k++) {
          const bx = start + 6 + k;
          if (bx >= 0 && bx < maxXForBeats) {
            level.putBrick(bx, y, null);
            bricks++;
          }
        }
      }

      if (feature === "hills_blocks") {
        const stacks = rint(rng, 2, 4);
        for (let s = 0; s < stacks; s++) {
          const wx = Math.min(maxXForBeats - 2, start + rint(rng, 6, Math.max(6, (end - start) - 6)));
          const h = rint(rng, 2, 5);
          for (let t = 1; t <= h; t++) level.putWall(wx, GY, t);
        }
      }

      if (feature === "gaps") {
        const n = rint(rng, 1, 2);
        for (let g = 0; g < n; g++) {
          const gx = Math.min(maxXForBeats - 8, start + rint(rng, 8, Math.max(8, (end - start) - 8)));
          const w = rint(rng, 2, CONSTRAINTS.MAX_GAP);
          const realW = carveGap(gx, w);

          // coin arc as qblocks (safe-ish)
          for (let c = 0; c < realW; c++) {
            const qx = gx + c;
            if (qx >= 0 && qx < maxXForBeats && ground[qx] === false) {
              // put coins above the gap; doesn't require ground
              level.putQBlock(qx, 5, new Mario.Bcoin([qx * 16, 80]));
            }
          }
        }
      }

      // -------- schema-preserved beats --------
      if (feature === "schema:pipe_goomba") {
        const px = Math.min(maxXForBeats - 3, start + rint(rng, 10, Math.max(10, (end - start) - 10)));
        const ph = rint(rng, 2, 4);
        if (ground[px] && ground[px + 1]) level.putPipe(px, GY, ph);

        if (enemies < CONSTRAINTS.MAX_ENEMIES) {
          const ex = Math.min(maxXForBeats - 2, px + 6);
          if (ground[ex] && !forbiddenEnemy[ex]) {
            level.putGoomba(ex, 12);
            enemies++;
          }
        }
      }

      if (feature === "schema:coin_arc_gap") {
        const gx = Math.min(maxXForBeats - 10, start + rint(rng, 10, Math.max(10, (end - start) - 10)));
        const w = rint(rng, 2, 4);
        const realW = carveGap(gx, w);

        for (let c = 0; c < realW; c++) {
          const qx = gx + c;
          if (qx >= 0 && qx < maxXForBeats) {
            level.putQBlock(qx, 7, new Mario.Bcoin([qx * 16, 112]));
          }
        }
      }

      // schema:stair_to_flag is enforced at the end (below), keep beat as a marker only.

      x = end;
    }

    // Build ground segments from occupancy
    let startSeg = null;
    for (let i = 0; i < widthTiles; i++) {
      if (ground[i] && startSeg == null) startSeg = i;
      if ((!ground[i] || i === widthTiles - 1) && startSeg != null) {
        const endSeg = (ground[i] && i === widthTiles - 1) ? i : i - 1;
        level.putFloor(startSeg, endSeg);
        startSeg = null;
      }
    }

    // End staircase + flag (schema-preserved anchor)
    const flagX = Math.min(widthTiles - 14, 198);
    const sx = Math.max(10, flagX - 10);
    for (let k = 1; k <= 8; k++) level.putWall(sx + k, GY, k);
    level.putFlagpole(flagX);

    // IMPORTANT: expose built level for console + metrics
    window.level = level;
  }

  // =========================================================
  // 5) Public entry: Mario.oneone_v2_4(opts)
  // =========================================================
  Mario.oneone_v2_4 = function (opts) {
    opts = opts || {};

    // reset spam guard for this load
    window.__MARIO_LOGGED_THIS_LOAD = false;

    const evolveRequested = !!opts.evolve || !!window.MARIO_EVOLVE;

    // seed policy: if evolve true, keep stable per click unless a seed is passed
    let seed;
    if (evolveRequested) {
      if (typeof opts.seed === "number") seed = (opts.seed | 0);
      else seed = (Math.floor(Math.random() * 1e9) | 0);
      window.MARIO_SEED = seed;
      setSeedDisplay(seed);
    } else {
      seed = (typeof opts.seed === "number") ? (opts.seed | 0) : 0;
      window.MARIO_SEED = null;
      setSeedDisplay(null);
    }

    // run meta used by logger (this is what labels your JSON!)
    window.MARIO_RUN_META = {
      level_id: "1-1",
      file_id: FILE_ID,
      generator_version: GENERATOR_VERSION,
      mode: evolveRequested ? "pcg" : "baseline",
      seed: evolveRequested ? seed : null
    };

    const rng = mulberry32(seed || 123456789);

    level = new Mario.Level({
      playerPos: [56, 192],
      loader: Mario.oneone_v2_4,
      background: (evolveRequested ? "#000000" : "#7974FF"),
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

    // expose immediately (helps console debugging)
    window.level = level;

    // player reset
    player.pos[0] = level.playerPos[0];
    player.pos[1] = level.playerPos[1];
    vX = 0;

    // build genomes
    let gA = makeBaseGenome();

    if (evolveRequested) {
      let gB = makeBaseGenome().map(b => ({ ...b }));
      gB = mutateGenome(rng, gB);

      let child = crossover(rng, gA, gB);
      child = mutateGenome(rng, child);

      compileAndBuild(level, child, rng, 212);
    } else {
      // baseline = the unmutated schema-preserved genome
      compileAndBuild(level, gA, rng, 212);
    }

    // music
    music.underground.pause();
    music.overworld.play();

    // log ONCE (guarded)
    window.MARIO_METRICS.logRun("auto");
  };
})();
