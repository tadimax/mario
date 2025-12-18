// js/levels/12.js
console.log("✅ LOADED js/levels/12.js (TRUE SEEDED 1-2 LOADER)");

(function () {
  const FIXED_SEED = 12002; // <-- your saved mutation seed

  function resetPlayerState() {
    // Position/velocity reset (safe)
    player.pos[0] = 56;
    player.pos[1] = 192;
    vX = 0;

    // Power/state reset (best-effort: depends on your repo's player implementation)
    // If your player has a reset function, use it.
    if (typeof player.reset === "function") {
      player.reset();
      return;
    }

    // Otherwise, try common fields used in Mario clones:
    if ("isBig" in player) player.isBig = false;
    if ("isFire" in player) player.isFire = false;
    if ("big" in player) player.big = false;
    if ("fire" in player) player.fire = false;
    if ("invincible" in player) player.invincible = false;
    if ("invincibility" in player) player.invincibility = 0;
    if ("starTime" in player) player.starTime = 0;
  }

  Mario.onetwo = function (opts) {
    opts = opts || {};

    // Require exports from 11.js
    if (
      typeof window.MARIO_PCG_BASE_SPEC === "undefined" ||
      typeof window.MARIO_PCG_MUTATE !== "function" ||
      typeof window.MARIO_PCG_BUILD !== "function"
    ) {
      console.warn("PCG helpers missing. Make sure 11.js loads before 12.js.");
      return Mario.oneone({ evolve: false });
    }

    const seed = FIXED_SEED;

    // Build a fresh level with loader = Mario.onetwo (IMPORTANT)
    level = new Mario.Level({
      playerPos: [56, 192],
      loader: Mario.onetwo,
      background: "#000000", // always black for 1-2
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

    resetPlayerState();

    const mutated = window.MARIO_PCG_MUTATE(window.MARIO_PCG_BASE_SPEC, seed);
    console.log("1-2 SEEDED PCG (fixed), seed =", seed);

    window.MARIO_PCG_BUILD(level, mutated);

    music.underground.pause();
    music.overworld.play();
  };
})();
