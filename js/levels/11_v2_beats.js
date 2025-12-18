// js/levels/11_v2_beats.js (REPLACEMENT)
// World 1-1 (V2): Holland-style beat genome + reproducible seed + SAFE metrics logging (no spam)
console.log("✅ LOADED js/levels/11_v2_beats.js");

(function () {
  // =========================================================
  // 0) METRICS (single source of truth)
  // =========================================================
  const RUNS_KEY = "mario_runs";
  const FILE_ID = "11_v2_beats";
  const GENERATOR_VERSION = "v2_beats";

  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch { return fallback; }
  }

  if (!window.MARIO_METRICS) {
    window.MARIO_METRICS = {
      _getRuns() {
        return safeParse(localStorage.getItem(RUNS_KEY) || "[]", []);
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
      // Count from engine containers (NOT level.entities)
      _computeMetrics() {
        const lvl = window.level;
        if (!lvl) return { ok: false, reason: "window.level not set" };

        // Enemies & pipes are real arrays in this engine
        const enemies = Array.isArray(lvl.enemies) ? lvl.enemies.length : 0;
        const pipes = Array.isArray(lvl.pipes) ? lvl.pipes.length : 0;

        // Blocks are a 2D grid (15 rows)
        let blocks = 0;
        if (Array.isArray(lvl.blocks)) {
          for (let r = 0; r < lvl.blocks.length; r++) {
            const row = lvl.blocks[r];
            if (!Array.isArray(row)) continue;
            for (let c = 0; c < row.length; c++) {
              if (row[c]) blocks++;
            }
          }
        }

        // Floors + gaps: look at “ground row” in statics (row index 13)
        // In this Mario.js, ground is placed with putFloor at y=13.
        let floors = 0;
        let gaps = 0;

        const groundRowIndex = 13;
        const statics = lvl.statics;

        if (Array.isArray(statics) && Array.isArray(statics[groundRowIndex])) {
          const row = statics[groundRowIndex];
          let lastWasSolid = false;

          for (let x = 0; x < row.length; x++) {
            const cell = row[x];
            const solid = !!cell; // treat any static at ground row as solid support

            if (solid) floors++;

            // gap counting: count transitions solid -> empty segments
            if (!solid && lastWasSolid) {
              gaps++;
            }
            lastWasSolid = solid;
          }
        } else {
          // Fallback (rare): if statics missing, infer from floors segments if present
          if (Array.isArray(lvl.floors) && lvl.floors.length) {
            // floors might be [{start,end}, ...]
            let lastEnd = null;
            for (const seg of lvl.floors) {
              if (seg && typeof seg.start === "number" && typeof seg.end === "number") {
                floors += (seg.end - seg.start + 1);
                if (lastEnd != null && seg.start > lastEnd + 1) gaps++;
                lastEnd = seg.end;
              }
            }
          }
        }

        return { ok: true, floors, gaps, enemies, blocks, pipes };
      },
      // Log ONCE per level instance unless forced
      logRun(note, force) {
        const lvl = window.level;
        if (!lvl) {
          console.warn("MARIO_METRICS.logRun: no window.level");
          return null;
        }

        if (!force && lvl.__metricsLogged) {
          // Prevent runaway spam when loader gets called repeatedly
          return null;
        }
        lvl.__metricsLogged = true;

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
  // 1) Deterministic RNG (Mulberry32)
  // =========================================================
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rint(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); }
  function choice(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  // =========================================================
  // 2) Constraints
  // =========================================================
  const CONSTRAINTS = {
    MAX_GAP: 4,
    MIN_LANDING: 2,
    MIN_START_GROUND: 12
  };

  // =========================================================
  // 3) Authored baseline builder (original 1-1 placements)
  // =========================================================
  function buildAuthoredBaseline(level) {
    player.pos[0] = level.playerPos[0];
    player.pos[1] = level.playerPos[1];
    vX = 0;

    var ground = [[0,69],[71,86],[89,153],[155,212]];
    ground.forEach(function (loc) { level.putFloor(loc[0], loc[1]); });

    var clouds = [[7,3],[19,2],[56,3],[67,2],[87,2],[103,2],[152,3],[163,2],[200,3]];
    clouds.forEach(([x,y]) => level.putCloud(x,y));

    var twoClouds = [[36,2],[132,2],[180,2]];
    twoClouds.forEach(([x,y]) => level.putTwoCloud(x,y));

    var threeClouds = [[27,3],[75,3],[123,3],[171,3]];
    threeClouds.forEach(([x,y]) => level.putThreeCloud(x,y));

    var bHills = [0,48,96,144,192];
    bHills.forEach(x => level.putBigHill(x, 12));

    var sHills = [16,64,111,160];
    sHills.forEach(x => level.putSmallHill(x, 12));

    var bushes = [23,71,118,167];
    bushes.forEach(x => level.putBush(x, 12));

    var twoBushes = [41,89,137];
    twoBushes.forEach(x => level.putTwoBush(x, 12));

    var threeBushes = [11,59,106];
    threeBushes.forEach(x => level.putThreeBush(x, 12));

    level.putQBlock(16, 9, new Mario.Bcoin([256, 144]));
    level.putBrick(20, 9, null);
    level.putQBlock(21, 9, new Mario.Mushroom([336, 144]));
    level.putBrick(22, 9, null);
    level.putQBlock(22, 5, new Mario.Bcoin([352, 80]));
    level.putQBlock(23, 9, new Mario.Bcoin([368, 144]));
    level.putBrick(24, 9, null);

    level.putPipe(28, 13, 2);
    level.putPipe(38, 13, 3);
    level.putPipe(46, 13, 4);
    level.putRealPipe(57, 9, 4, "DOWN", Mario.oneonetunnel);

    level.putBrick(77, 9, null);
    level.putQBlock(78, 9, new Mario.Mushroom([1248, 144]));
    level.putBrick(79, 9, null);

    for (let x = 80; x <= 87; x++) level.putBrick(x, 5, null);
    for (let x = 91; x <= 93; x++) level.putBrick(x, 5, null);

    level.putQBlock(94, 5, new Mario.Bcoin([1504, 80]));
    level.putBrick(94, 9, null);

    level.putBrick(100, 9, new Mario.Star([1600, 144]));
    level.putBrick(101, 9, null);

    level.putQBlock(105, 9, new Mario.Bcoin([1680, 144]));
    level.putQBlock(108, 9, new Mario.Bcoin([1728, 144]));
    level.putQBlock(108, 5, new Mario.Mushroom([1728, 80]));
    level.putQBlock(111, 9, new Mario.Bcoin([1776, 144]));

    level.putBrick(117, 9, null);
    for (let x = 120; x <= 123; x++) level.putBrick(x, 5, null);
    level.putBrick(128, 5, null);

    level.putQBlock(129, 5, new Mario.Bcoin([2074, 80]));
    level.putBrick(129, 9, null);
    level.putQBlock(130, 5, new Mario.Bcoin([2080, 80]));
    level.putBrick(130, 9, null);
    level.putBrick(131, 5, null);

    level.putWall(134, 13, 1);
    level.putWall(135, 13, 2);
    level.putWall(136, 13, 3);
    level.putWall(137, 13, 4);

    level.putWall(140, 13, 4);
    level.putWall(141, 13, 3);
    level.putWall(142, 13, 2);
    level.putWall(143, 13, 1);

    level.putWall(148, 13, 1);
    level.putWall(149, 13, 2);
    level.putWall(150, 13, 3);
    level.putWall(151, 13, 4);
    level.putWall(152, 13, 4);

    level.putWall(155, 13, 4);
    level.putWall(156, 13, 3);
    level.putWall(157, 13, 2);
    level.putWall(158, 13, 1);

    level.putPipe(163, 13, 2);

    level.putBrick(168, 9, null);
    level.putBrick(169, 9, null);
    level.putQBlock(170, 9, new Mario.Bcoin([2720, 144]));
    level.putBrick(171, 9, null);

    level.putPipe(179, 13, 2);

    for (let k = 1; k <= 8; k++) level.putWall(180 + k, 13, k);
    level.putFlagpole(198);

    level.putGoomba(22, 12);
    level.putGoomba(40, 12);
    level.putGoomba(50, 12);
    level.putGoomba(51, 12);
    level.putGoomba(82, 4);
    level.putGoomba(84, 4);
    level.putGoomba(100, 12);
    level.putGoomba(102, 12);
    level.putGoomba(114, 12);
    level.putGoomba(115, 12);
    level.putGoomba(122, 12);
    level.putGoomba(123, 12);
    level.putGoomba(125, 12);
    level.putGoomba(126, 12);
    level.putGoomba(170, 12);
    level.putGoomba(172, 12);
    level.putKoopa(35, 11);
  }

  // =========================================================
  // 4) Beat genome + Holland-ish operators (your 3 techniques)
  //    - random parent genome
  //    - beat-level crossover
  //    - permutation mutation (swap/reverse/tweak/dup/delete)
  // =========================================================
  function baselineGenome() {
    return [
      { t: "RUN", len: 18 },
      { t: "REWARD", len: 8 },
      { t: "PIPE", len: 10 },
      { t: "GAP", len: 8 },
      { t: "RUN", len: 20 },
      { t: "PLAT", len: 12 },
      { t: "ENEMY", len: 12, budget: 3 },
      { t: "PIPE", len: 12 },
      { t: "REWARD", len: 10 },
      { t: "GAP", len: 10 },
      { t: "RUN", len: 18 },
      { t: "ENEMY", len: 16, budget: 4 },
      { t: "STAIRS_END", len: 26 }
    ];
  }

  function randomGenome(rng, totalLen) {
    const beats = [];
    let used = 0;
    const pool = ["RUN", "GAP", "PIPE", "PLAT", "REWARD", "ENEMY"];

    while (used < totalLen - 26) {
      const t = choice(rng, pool);
      const len = rint(rng, 8, 18);
      const beat = { t, len };
      if (t === "ENEMY") beat.budget = rint(rng, 1, 5);
      beats.push(beat);
      used += len;
    }
    beats.push({ t: "STAIRS_END", len: 26 });
    return beats;
  }

  function crossover(rng, a, b) {
    const cutA = rint(rng, 2, Math.max(2, a.length - 3));
    const cutB = rint(rng, 2, Math.max(2, b.length - 3));
    const merged = a.slice(0, cutA).concat(b.slice(cutB)).filter(x => x.t !== "STAIRS_END");
    merged.push({ t: "STAIRS_END", len: 26 });
    return merged;
  }

  function mutateGenome(rng, g) {
    const out = g.slice();
    const ops = rint(rng, 1, 3);

    for (let k = 0; k < ops; k++) {
      const op = rint(rng, 1, 5);

      if (op === 1 && out.length > 6) {
        const i = rint(rng, 1, out.length - 3);
        const j = rint(rng, 1, out.length - 3);
        const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
      } else if (op === 2 && out.length > 7) {
        const i = rint(rng, 1, out.length - 4);
        const j = rint(rng, i + 1, out.length - 3);
        const seg = out.slice(i, j + 1).reverse();
        out.splice(i, seg.length, ...seg);
      } else if (op === 3) {
        const i = rint(rng, 0, out.length - 2);
        out[i].len = Math.max(6, Math.min(24, out[i].len + rint(rng, -4, 4)));
      } else if (op === 4) {
        const i = rint(rng, 1, out.length - 3);
        out.splice(i, 0, { ...out[i] });
      } else if (op === 5 && out.length > 6) {
        const i = rint(rng, 1, out.length - 3);
        out.splice(i, 1);
      }
    }

    const cleaned = out.filter(x => x.t !== "STAIRS_END");
    cleaned.push({ t: "STAIRS_END", len: 26 });
    cleaned.forEach(b => { if (b.t === "ENEMY") b.budget = Math.max(1, Math.min(6, b.budget || 2)); });
    return cleaned;
  }

  // =========================================================
  // 5) Compile genome into placements
  // =========================================================
  function compileAndBuild(level, genome, rng, widthTiles) {
    const GY = 13;
    const ground = new Array(widthTiles).fill(true);
    const forbiddenEnemy = new Array(widthTiles).fill(false);
    const enemyXs = [];

    function carveGap(xStart, w) {
      const width = Math.min(CONSTRAINTS.MAX_GAP, Math.max(1, w));
      const xEnd = Math.min(widthTiles - 1 - CONSTRAINTS.MIN_LANDING, xStart + width - 1);
      for (let x = xStart; x <= xEnd; x++) ground[x] = false;

      // forbid enemies on landing tiles
      for (let k = 0; k < CONSTRAINTS.MIN_LANDING; k++) {
        const lx = xEnd + 1 + k;
        if (lx >= 0 && lx < widthTiles) forbiddenEnemy[lx] = true;
      }
    }

    // ensure safe start runway
    for (let x = 0; x < CONSTRAINTS.MIN_START_GROUND && x < widthTiles; x++) ground[x] = true;

    let x = 0;
    for (const beat of genome) {
      const len = beat.len | 0;

      if (beat.t === "GAP") {
        const w = rint(rng, 1, CONSTRAINTS.MAX_GAP);
        const gx = Math.min(widthTiles - 1 - (w + CONSTRAINTS.MIN_LANDING), x + rint(rng, 2, Math.max(2, len - 2)));
        carveGap(gx, w);
      }

      if (beat.t === "PIPE") {
        const px = Math.min(widthTiles - 3, x + rint(rng, 3, Math.max(3, len - 3)));
        const h = rint(rng, 2, 4);
        if (ground[px] && ground[px + 1]) level.putPipe(px, GY, h);
      }

      if (beat.t === "REWARD") {
        const rx = Math.min(widthTiles - 2, x + rint(rng, 3, Math.max(3, len - 3)));
        if (ground[rx]) {
          const item = (rng() < 0.7)
            ? new Mario.Bcoin([rx * 16, 144])
            : new Mario.Mushroom([rx * 16, 144]);
          level.putQBlock(rx, 9, item);
          if (rng() < 0.6) level.putBrick(rx - 1, 9, null);
          if (rng() < 0.6) level.putBrick(rx + 1, 9, null);
        }
      }

      if (beat.t === "PLAT") {
        const px = Math.min(widthTiles - 10, x + rint(rng, 4, Math.max(4, len - 6)));
        const plen = rint(rng, 4, 8);
        for (let i = 0; i < plen; i++) {
          if (px + i < widthTiles) level.putBrick(px + i, 5, null);
        }
      }

      if (beat.t === "ENEMY") {
        const budget = Math.max(1, Math.min(6, beat.budget || 2));
        let placed = 0, attempts = 0;

        while (placed < budget && attempts < 40) {
          attempts++;
          const ex = Math.min(widthTiles - 5, x + rint(rng, 2, Math.max(2, len - 2)));
          if (!ground[ex]) continue;
          if (forbiddenEnemy[ex]) continue;
          if (enemyXs.some(px => Math.abs(px - ex) < 3)) continue;

          if (rng() < 0.8) level.putGoomba(ex, 12);
          else level.putKoopa(ex, 11);

          enemyXs.push(ex);
          placed++;
        }
      }

      x += len;
    }

    // build ground from occupancy
    let start = null;
    for (let i = 0; i < widthTiles; i++) {
      if (ground[i] && start == null) start = i;
      if ((!ground[i] || i === widthTiles - 1) && start != null) {
        const end = (ground[i] && i === widthTiles - 1) ? i : i - 1;
        level.putFloor(start, end);
        start = null;
      }
    }

    // stairs + flag
    const flagX = Math.min(widthTiles - 14, 198);
    const sx = Math.max(10, flagX - 10);
    for (let k = 1; k <= 8; k++) level.putWall(sx + k, GY, k);
    level.putFlagpole(flagX);
  }

  // =========================================================
  // 6) Public entrypoint: Mario.oneone_v2(opts)
  // =========================================================
  Mario.oneone_v2 = function (opts) {
    opts = opts || {};

    // Always reset transient state when loading this level (prevents leaks)
    if (typeof window.__RESET_WORLD_STATE === "function") {
      window.__RESET_WORLD_STATE();
    }

    const evolveRequested = !!opts.evolve || !!window.MARIO_EVOLVE;

    // Seed policy (stable until changed)
    if (evolveRequested) {
      if (typeof opts.seed === "number") {
        window.MARIO_EVOLVE_SEED = opts.seed | 0;
      } else if (typeof window.MARIO_EVOLVE_SEED !== "number") {
        window.MARIO_EVOLVE_SEED = (Math.floor(Math.random() * 1e9) | 0);
      }
      setSeedDisplay(window.MARIO_EVOLVE_SEED);
    } else {
      setSeedDisplay(null);
    }

    const bgColor = evolveRequested ? "#000000" : "#7974FF";

    // Label every run with correct file/version/mode/seed
    window.MARIO_RUN_META = {
      level_id: "1-1",
      file_id: FILE_ID,
      generator_version: GENERATOR_VERSION,
      mode: evolveRequested ? "pcg" : "baseline",
      seed: evolveRequested ? (window.MARIO_EVOLVE_SEED | 0) : null
    };

    level = new Mario.Level({
      playerPos: [56, 192],
      loader: Mario.oneone_v2,
      background: bgColor,

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

    // Make visible to console & metrics immediately
    window.level = level;

    // Update HUD if present
    if (typeof window.__PCG_HUD_UPDATE === "function") window.__PCG_HUD_UPDATE();

    // Music (unchanged)
    music.underground.pause();
    music.overworld.play();

    if (!evolveRequested) {
      console.log("1-1 V2: BASELINE (authored)");
      buildAuthoredBaseline(level);

      // Log once per load
      window.MARIO_METRICS.logRun("auto");
      return;
    }

    const seed = window.MARIO_EVOLVE_SEED | 0;
    console.log("1-1 V2: PCG (black sky) seed =", seed);

    const rng = mulberry32(seed);

    const parentA = baselineGenome();
    const parentB = randomGenome(rng, 212);

    let child = crossover(rng, parentA, parentB);
    child = mutateGenome(rng, child);

    compileAndBuild(level, child, rng, 212);

    // Log once per load
    window.MARIO_METRICS.logRun("auto");
  };
})();
