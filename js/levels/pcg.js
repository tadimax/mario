// js/pcg.js
(function () {
  // ---------- RNG + helpers ----------
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randInt(rng, min, max) {
    return min + ((max - min + 1) * rng() | 0);
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // ---------- Base authored spec for 1-1 ----------
  window.ONEONE_BASE_SPEC = {
    width: 212,
    playerPos: [56, 192],
    flagX: 198,

    // floor segments: [startX, endX]
    ground: [
      [0, 69],
      [71, 86],
      [89, 153],
      [155, 212]
    ],

    // simple pipes
    pipes: [
      { x: 28, y: 13, h: 2 },
      { x: 38, y: 13, h: 3 },
      { x: 46, y: 13, h: 4 },
      { x: 163, y: 13, h: 2 },
      { x: 179, y: 13, h: 2 }
    ],

    // pipe that leads to tunnel level
    realPipes: [
      { x: 57, y: 9, h: 4, dir: "DOWN", dest: "oneonetunnel" }
    ],

    // staircase walls
    walls: [
      { x: 134, y: 13, h: 1 },
      { x: 135, y: 13, h: 2 },
      { x: 136, y: 13, h: 3 },
      { x: 137, y: 13, h: 4 },

      { x: 140, y: 13, h: 4 },
      { x: 141, y: 13, h: 3 },
      { x: 142, y: 13, h: 2 },
      { x: 143, y: 13, h: 1 },

      { x: 148, y: 13, h: 1 },
      { x: 149, y: 13, h: 2 },
      { x: 150, y: 13, h: 3 },
      { x: 151, y: 13, h: 4 },
      { x: 152, y: 13, h: 4 },
      { x: 155, y: 13, h: 4 },
      { x: 156, y: 13, h: 3 },
      { x: 157, y: 13, h: 2 },
      { x: 158, y: 13, h: 1 },

      { x: 181, y: 13, h: 1 },
      { x: 182, y: 13, h: 2 },
      { x: 183, y: 13, h: 3 },
      { x: 184, y: 13, h: 4 },
      { x: 185, y: 13, h: 5 },
      { x: 186, y: 13, h: 6 },
      { x: 187, y: 13, h: 7 },
      { x: 188, y: 13, h: 8 },
      { x: 189, y: 13, h: 8 }
    ],

    // bricks (no item = null)
    bricks: [
      { x: 20, y: 9 },
      { x: 22, y: 9 },
      { x: 24, y: 9 },
      { x: 77, y: 9 },
      { x: 79, y: 9 },

      { x: 80, y: 5 },
      { x: 81, y: 5 },
      { x: 82, y: 5 },
      { x: 83, y: 5 },
      { x: 84, y: 5 },
      { x: 85, y: 5 },
      { x: 86, y: 5 },
      { x: 87, y: 5 },

      { x: 91, y: 5 },
      { x: 92, y: 5 },
      { x: 93, y: 5 },

      { x: 94, y: 9 },

      { x: 100, y: 9, item: "star", itemArgs: [1600, 144] },
      { x: 101, y: 9 },

      { x: 117, y: 9 },

      { x: 120, y: 5 },
      { x: 121, y: 5 },
      { x: 122, y: 5 },
      { x: 123, y: 5 },

      { x: 128, y: 5 },
      { x: 129, y: 9 },
      { x: 130, y: 9 },
      { x: 131, y: 5 },

      { x: 168, y: 9 },
      { x: 169, y: 9 },
      { x: 171, y: 9 }
    ],

    // question blocks
    qblocks: [
      { x: 16, y: 9, item: "bcoin",    itemArgs: [256, 144] },
      { x: 21, y: 9, item: "mushroom", itemArgs: [336, 144] },
      { x: 22, y: 5, item: "bcoin",    itemArgs: [352, 80] },
      { x: 23, y: 9, item: "bcoin",    itemArgs: [368, 144] },

      { x: 78, y: 9, item: "mushroom", itemArgs: [1248, 144] },

      { x: 94, y: 5, item: "bcoin",    itemArgs: [1504, 80] },

      { x: 105, y: 9, item: "bcoin",   itemArgs: [1680, 144] },
      { x: 108, y: 9, item: "bcoin",   itemArgs: [1728, 144] },
      { x: 108, y: 5, item: "mushroom",itemArgs: [1728, 80] },
      { x: 111, y: 9, item: "bcoin",   itemArgs: [1776, 144] },

      { x: 129, y: 5, item: "bcoin",   itemArgs: [2074, 80] },
      { x: 130, y: 5, item: "bcoin",   itemArgs: [2080, 80] },

      { x: 170, y: 9, item: "bcoin",   itemArgs: [2720, 144] }
    ],

    // enemies
    enemies: [
      { t: "goomba", x: 22,  y: 12 },
      { t: "goomba", x: 40,  y: 12 },
      { t: "goomba", x: 50,  y: 12 },
      { t: "goomba", x: 51,  y: 12 },
      { t: "goomba", x: 82,  y: 4  },
      { t: "goomba", x: 84,  y: 4  },
      { t: "goomba", x: 100, y: 12 },
      { t: "goomba", x: 102, y: 12 },
      { t: "goomba", x: 114, y: 12 },
      { t: "goomba", x: 115, y: 12 },
      { t: "goomba", x: 122, y: 12 },
      { t: "goomba", x: 123, y: 12 },
      { t: "goomba", x: 125, y: 12 },
      { t: "goomba", x: 126, y: 12 },
      { t: "goomba", x: 170, y: 12 },
      { t: "goomba", x: 172, y: 12 },
      { t: "koopa",  x: 35,  y: 11 }
    ],

    // scenery
    clouds:  [[7,3],[19,2],[56,3],[67,2],[87,2],[103,2],[152,3],[163,2],[200,3]],
    clouds2: [[36,2],[132,2],[180,2]],
    clouds3: [[27,3],[75,3],[123,3],[171,3]],

    bigHills:   [0,48,96,144,192],
    smallHills: [16,64,111,160],

    bushes:  [23,71,118,167],
    bushes2: [41,89,137],
    bushes3: [11,59,106]
  };

  // ---------- Build level from spec ----------
  window.buildLevelFromSpec = function (level, spec) {
    // floor
    spec.ground.forEach(function (seg) {
      level.putFloor(seg[0], seg[1]);
    });

    // pipes
    if (spec.pipes) {
      spec.pipes.forEach(function (p) {
        level.putPipe(p.x, p.y, p.h);
      });
    }

    if (spec.realPipes) {
      spec.realPipes.forEach(function (p) {
        var dest = Mario.oneone;
        if (p.dest === "oneonetunnel" && Mario.oneonetunnel) {
          dest = Mario.oneonetunnel;
        }
        level.putRealPipe(p.x, p.y, p.h, p.dir || "DOWN", dest);
      });
    }

    // walls / stairs
    if (spec.walls) {
      spec.walls.forEach(function (w) {
        level.putWall(w.x, w.y, w.h);
      });
    }

    // bricks
    if (spec.bricks) {
      spec.bricks.forEach(function (b) {
        var itemObj = null;
        if (b.item === "star") {
          itemObj = new Mario.Star(b.itemArgs || [0, 0]);
        }
        level.putBrick(b.x, b.y, itemObj);
      });
    }

    // qblocks
    if (spec.qblocks) {
      spec.qblocks.forEach(function (q) {
        var itemObj = null;
        if (q.item === "bcoin") {
          itemObj = new Mario.Bcoin(q.itemArgs || [0, 0]);
        } else if (q.item === "mushroom") {
          itemObj = new Mario.Mushroom(q.itemArgs || [0, 0]);
        } else if (q.item === "star") {
          itemObj = new Mario.Star(q.itemArgs || [0, 0]);
        }
        level.putQBlock(q.x, q.y, itemObj);
      });
    }

    // enemies
    if (spec.enemies) {
      spec.enemies.forEach(function (e) {
        if (e.t === "goomba") {
          level.putGoomba(e.x, e.y);
        } else if (e.t === "koopa") {
          level.putKoopa(e.x, e.y);
        }
      });
    }

    // flag
    if (typeof spec.flagX === "number") {
      level.putFlagpole(spec.flagX);
    }

    // scenery (non-colliding)
    if (spec.clouds) {
      spec.clouds.forEach(function (c) {
        level.putCloud(c[0], c[1]);
      });
    }
    if (spec.clouds2) {
      spec.clouds2.forEach(function (c) {
        level.putTwoCloud(c[0], c[1]);
      });
    }
    if (spec.clouds3) {
      spec.clouds3.forEach(function (c) {
        level.putThreeCloud(c[0], c[1]);
      });
    }
    if (spec.bigHills) {
      spec.bigHills.forEach(function (x) {
        level.putBigHill(x, 12);
      });
    }
    if (spec.smallHills) {
      spec.smallHills.forEach(function (x) {
        level.putSmallHill(x, 12);
      });
    }
    if (spec.bushes) {
      spec.bushes.forEach(function (x) {
        level.putBush(x, 12);
      });
    }
    if (spec.bushes2) {
      spec.bushes2.forEach(function (x) {
        level.putTwoBush(x, 12);
      });
    }
    if (spec.bushes3) {
      spec.bushes3.forEach(function (x) {
        level.putThreeBush(x, 12);
      });
    }
  };

  // ---------- Mutation: visible but safe ----------
  window.mutateSpec = function (baseSpec, seed, opts) {
    opts = opts || {};
    var rng = mulberry32(seed >>> 0);
    var s = deepClone(baseSpec);

    var width = s.width || 212;

    // 1) Jitter some enemies horizontally
    if (s.enemies) {
      s.enemies.forEach(function (e) {
        var shift = randInt(rng, -4, 4);
        e.x = clamp(e.x + shift, 10, width - 10);
      });
    }

    // 2) Move some coin blocks slightly
    if (s.qblocks) {
      s.qblocks.forEach(function (q) {
        if (q.item === "bcoin") {
          var shift = randInt(rng, -3, 3);
          q.x = clamp(q.x + shift, 10, width - 10);
        }
      });
    }

    // 3) Add or remove a goomba in the mid-section
    if (s.enemies && s.enemies.length > 0) {
      if (rng() < 0.5 && s.enemies.length > 8) {
        var idx = randInt(rng, 3, s.enemies.length - 4);
        s.enemies.splice(idx, 1);
      } else if (rng() < 0.5) {
        s.enemies.push({ t: "goomba", x: randInt(rng, 60, 150), y: 12 });
      }
    }

    // 4) Slightly move one staircase wall to make structure visibly different
    if (s.walls && s.walls.length > 0) {
      var wi = randInt(rng, 0, s.walls.length - 1);
      var w = s.walls[wi];
      var shiftWall = randInt(rng, -1, 1);
      w.x = clamp(w.x + shiftWall, 120, width - 10);
    }

    // 5) Move one pipe a bit
    if (s.pipes && s.pipes.length > 0) {
      var pi = randInt(rng, 0, s.pipes.length - 1);
      var p = s.pipes[pi];
      var shiftPipe = randInt(rng, -1, 1);
      p.x = clamp(p.x + shiftPipe, 20, width - 10);
    }

    return s;
  };
})();
