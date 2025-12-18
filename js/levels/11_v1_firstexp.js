// js/levels/11.js
console.log("✅ LOADED js/levels/11.js (BASELINE + PCG TOGGLE + EXPORTS)");

(function () {
  // ---- seeded RNG ----
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rint(rng, lo, hi) { return lo + (((hi - lo + 1) * rng()) | 0); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  // ---- BASELINE spec from your authored 1-1 ----
  const BASE = {
    ground: [[0,69],[71,86],[89,153],[155,212]],
    clouds: [[7,3],[19,2],[56,3],[67,2],[87,2],[103,2],[152,3],[163,2],[200,3]],
    twoClouds: [[36,2],[132,2],[180,2]],
    threeClouds: [[27,3],[75,3],[123,3],[171,3]],
    bigHills: [0,48,96,144,192],
    smallHills: [16,64,111,160],
    bushes: [23,71,118,167],
    twoBushes: [41,89,137],
    threeBushes: [11,59,106],

    qblocks: [
      {x:16,y:9,item:"bcoin",args:[256,144]},
      {x:21,y:9,item:"mushroom",args:[336,144]},
      {x:22,y:5,item:"bcoin",args:[352,80]},
      {x:23,y:9,item:"bcoin",args:[368,144]},
      {x:78,y:9,item:"mushroom",args:[1248,144]},
      {x:94,y:5,item:"bcoin",args:[1504,80]},
      {x:105,y:9,item:"bcoin",args:[1680,144]},
      {x:108,y:9,item:"bcoin",args:[1728,144]},
      {x:108,y:5,item:"mushroom",args:[1728,80]},
      {x:111,y:9,item:"bcoin",args:[1776,144]},
      {x:129,y:5,item:"bcoin",args:[2074,80]},
      {x:130,y:5,item:"bcoin",args:[2080,80]},
      {x:170,y:9,item:"bcoin",args:[2720,144]}
    ],
    bricks: [
      {x:20,y:9},{x:22,y:9},{x:24,y:9},
      {x:77,y:9},{x:79,y:9},
      {x:80,y:5},{x:81,y:5},{x:82,y:5},{x:83,y:5},{x:84,y:5},{x:85,y:5},{x:86,y:5},{x:87,y:5},
      {x:91,y:5},{x:92,y:5},{x:93,y:5},
      {x:94,y:9},
      {x:100,y:9,item:"star",args:[1600,144]},
      {x:101,y:9},
      {x:117,y:9},
      {x:120,y:5},{x:121,y:5},{x:122,y:5},{x:123,y:5},
      {x:128,y:5},{x:129,y:9},{x:130,y:9},{x:131,y:5},
      {x:168,y:9},{x:169,y:9},{x:171,y:9}
    ],
    pipes: [
      {x:28,y:13,h:2,type:"pipe"},
      {x:38,y:13,h:3,type:"pipe"},
      {x:46,y:13,h:4,type:"pipe"},
      {x:57,y:9,h:4,type:"realpipe",dir:"DOWN",dest:"oneonetunnel"},
      {x:163,y:13,h:2,type:"pipe"},
      {x:179,y:13,h:2,type:"pipe"}
    ],
    walls: [
      {x:134,y:13,h:1},{x:135,y:13,h:2},{x:136,y:13,h:3},{x:137,y:13,h:4},
      {x:140,y:13,h:4},{x:141,y:13,h:3},{x:142,y:13,h:2},{x:143,y:13,h:1},
      {x:148,y:13,h:1},{x:149,y:13,h:2},{x:150,y:13,h:3},{x:151,y:13,h:4},{x:152,y:13,h:4},
      {x:155,y:13,h:4},{x:156,y:13,h:3},{x:157,y:13,h:2},{x:158,y:13,h:1},
      {x:181,y:13,h:1},{x:182,y:13,h:2},{x:183,y:13,h:3},{x:184,y:13,h:4},
      {x:185,y:13,h:5},{x:186,y:13,h:6},{x:187,y:13,h:7},{x:188,y:13,h:8},{x:189,y:13,h:8}
    ],
    flagX: 198,
    enemies: [
      {t:"goomba",x:22,y:12},{t:"goomba",x:40,y:12},{t:"goomba",x:50,y:12},{t:"goomba",x:51,y:12},
      {t:"goomba",x:82,y:4},{t:"goomba",x:84,y:4},
      {t:"goomba",x:100,y:12},{t:"goomba",x:102,y:12},
      {t:"goomba",x:114,y:12},{t:"goomba",x:115,y:12},
      {t:"goomba",x:122,y:12},{t:"goomba",x:123,y:12},{t:"goomba",x:125,y:12},{t:"goomba",x:126,y:12},
      {t:"goomba",x:170,y:12},{t:"goomba",x:172,y:12},
      {t:"koopa",x:35,y:11}
    ]
  };

  function buildFromSpec(level, spec) {
    // ground
    spec.ground.forEach(([a,b]) => level.putFloor(a,b));

    // scenery
    spec.clouds.forEach(([x,y]) => level.putCloud(x,y));
    spec.twoClouds.forEach(([x,y]) => level.putTwoCloud(x,y));
    spec.threeClouds.forEach(([x,y]) => level.putThreeCloud(x,y));
    spec.bigHills.forEach(x => level.putBigHill(x,12));
    spec.smallHills.forEach(x => level.putSmallHill(x,12));
    spec.bushes.forEach(x => level.putBush(x,12));
    spec.twoBushes.forEach(x => level.putTwoBush(x,12));
    spec.threeBushes.forEach(x => level.putThreeBush(x,12));

    // qblocks
    spec.qblocks.forEach(q => {
      let item = null;
      if (q.item === "bcoin") item = new Mario.Bcoin(q.args);
      if (q.item === "mushroom") item = new Mario.Mushroom(q.args);
      if (q.item === "star") item = new Mario.Star(q.args);
      level.putQBlock(q.x, q.y, item);
    });

    // bricks
    spec.bricks.forEach(b => {
      let item = null;
      if (b.item === "star") item = new Mario.Star(b.args);
      level.putBrick(b.x, b.y, item);
    });

    // pipes
    spec.pipes.forEach(p => {
      if (p.type === "pipe") level.putPipe(p.x, p.y, p.h);
      if (p.type === "realpipe") {
        const dest = (p.dest === "oneonetunnel" && Mario.oneonetunnel) ? Mario.oneonetunnel : Mario.oneone;
        level.putRealPipe(p.x, p.y, p.h, p.dir || "DOWN", dest);
      }
    });

    // walls
    spec.walls.forEach(w => level.putWall(w.x, w.y, w.h));

    // flag
    level.putFlagpole(spec.flagX);

    // enemies
    spec.enemies.forEach(e => {
      if (e.t === "goomba") level.putGoomba(e.x, e.y);
      if (e.t === "koopa") level.putKoopa(e.x, e.y);
    });
  }

  // mutation: small but visible (we’ll expand later)
  function mutate(base, seed) {
    const rng = mulberry32(seed >>> 0);
    const s = clone(base);

    // shift interior ground edges (changes pit shapes)
    s.ground = s.ground.map(([a,b], i) => {
      if (i === 0 || i === s.ground.length - 1) return [a,b];
      const da = rint(rng, -3, 3);
      const db = rint(rng, -3, 3);
      let na = clamp(a + da, 0, 212);
      let nb = clamp(b + db, 0, 212);
      if (nb - na < 6) nb = na + 6;
      return [na, nb];
    });

    // sometimes carve a new pit (kept small)
    if (rng() < 0.65) {
      const idx = rint(rng, 0, s.ground.length - 1);
      const seg = s.ground[idx];
      const len = seg[1] - seg[0];
      if (len > 20) {
        const gapW = rint(rng, 3, 5); // conservative gap width
        const gapStart = rint(rng, seg[0] + 6, seg[1] - gapW - 6);
        const left = [seg[0], gapStart];
        const right = [gapStart + gapW, seg[1]];
        s.ground.splice(idx, 1, left, right);
      }
    }

    // move some enemies a bit
    s.enemies.forEach(e => {
      e.x = clamp(e.x + rint(rng, -6, 6), 5, 205);
    });

    // move some qblocks a bit
    s.qblocks.forEach(q => {
      if (rng() < 0.35) q.x = clamp(q.x + rint(rng, -4, 4), 5, 205);
    });

    return s;
  }

  // EXPORT for 12.js
  window.MARIO_PCG_BASE_SPEC = BASE;
  window.MARIO_PCG_BUILD = buildFromSpec;
  window.MARIO_PCG_MUTATE = mutate;

  Mario.oneone = function (opts) {
    opts = opts || {};
    const evolve = !!opts.evolve || !!window.MARIO_EVOLVE;
    const seed = (typeof opts.seed === "number") ? opts.seed : ((Math.random() * 1e9) | 0);

    level = new Mario.Level({
      playerPos: [56, 192],
      loader: Mario.oneone,
      background: evolve ? "#000000" : "#7974FF",
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

    player.pos[0] = level.playerPos[0];
    player.pos[1] = level.playerPos[1];
    vX = 0;

    const spec = evolve ? mutate(BASE, seed) : BASE;
    console.log(evolve ? ("1-1 PCG ON (black), seed=" + seed) : "1-1 BASELINE (blue)");
    buildFromSpec(level, spec);

    music.underground.pause();
    music.overworld.play();
  };
})();
