// js/game.js (REPLACEMENT)
// Adds: safe level reset + stable HUD + helper to load levels without state leaking.
// Does NOT change physics timing; if pace was slow, it was from state/leaks/reloads, not dt math.

var requestAnimFrame = (function () {
  return (
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
      window.setTimeout(callback, 1000 / 60);
    }
  );
})();

//create the canvas
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
var updateables = [];
var fireballs = [];
var player = new Mario.Player([0, 0]);

canvas.width = 762;
canvas.height = 720;
ctx.scale(3, 3);
document.body.appendChild(canvas);

//viewport
var vX = 0,
  vY = 0,
  vWidth = 256,
  vHeight = 240;

//load our images
resources.load([
  "sprites/player.png",
  "sprites/enemy.png",
  "sprites/tiles.png",
  "sprites/playerl.png",
  "sprites/items.png",
  "sprites/enemyr.png",
]);

resources.onReady(init);
var level;
var sounds;
var music;

// =========================================================
// PCG HUD (seed + file + mode + quick export)
// =========================================================
(function ensureHud() {
  if (document.getElementById("pcgHud")) return;

  var hud = document.createElement("div");
  hud.id = "pcgHud";
  hud.style.position = "fixed";
  hud.style.left = "10px";
  hud.style.top = "10px";
  hud.style.zIndex = "99999";
  hud.style.fontFamily = "Arial, sans-serif";
  hud.style.fontSize = "12px";
  hud.style.color = "#fff";
  hud.style.background = "rgba(0,0,0,0.65)";
  hud.style.border = "1px solid rgba(255,255,255,0.15)";
  hud.style.borderRadius = "10px";
  hud.style.padding = "10px";
  hud.style.minWidth = "260px";

  hud.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div style="font-weight:bold;">PCG HUD</div>
      <div id="pcgHudBadge" style="opacity:0.8;">idle</div>
    </div>

    <div style="margin-top:6px; line-height:1.35;">
      <div>Level: <span id="pcgHudLevel">-</span></div>
      <div>File: <span id="pcgHudFile">-</span></div>
      <div>Mode: <span id="pcgHudMode">-</span></div>
      <div>Seed: <span id="seedDisplay">(none)</span></div>
    </div>

    <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
      <button id="btnCopySeed" style="cursor:pointer; padding:6px 8px; border-radius:8px; border:1px solid rgba(255,255,255,0.2); background:#111; color:#fff;">Copy seed</button>
      <button id="btnExportRuns" style="cursor:pointer; padding:6px 8px; border-radius:8px; border:1px solid rgba(255,255,255,0.2); background:#111; color:#fff;">Export runs</button>
      <button id="btnClearRuns" style="cursor:pointer; padding:6px 8px; border-radius:8px; border:1px solid rgba(255,255,255,0.2); background:#111; color:#fff;">Clear runs</button>
    </div>
    <div style="margin-top:6px; opacity:0.75;">
      Tip: Press T in 1-1 to toggle baseline/PCG.
    </div>
  `;

  document.body.appendChild(hud);

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  window.__PCG_HUD_UPDATE = function () {
    var meta = window.MARIO_RUN_META || {};
    setText("pcgHudLevel", meta.level_id || "-");
    setText("pcgHudFile", meta.file_id || "-");
    setText("pcgHudMode", meta.mode || "-");
    setText("seedDisplay", meta.seed == null ? "(none)" : String(meta.seed));
    setText("pcgHudBadge", meta.generator_version || "running");
  };

  document.getElementById("btnCopySeed").addEventListener("click", function () {
    var meta = window.MARIO_RUN_META || {};
    var seed = meta.seed;
    if (seed == null) {
      console.log("No seed to copy (baseline).");
      return;
    }
    navigator.clipboard.writeText(String(seed)).then(
      function () {
        console.log("✅ Copied seed:", seed);
      },
      function () {
        console.log("Copy failed; seed =", seed);
      }
    );
  });

  document.getElementById("btnExportRuns").addEventListener("click", function () {
    if (!window.MARIO_METRICS || !window.MARIO_METRICS.exportAll) {
      console.warn("MARIO_METRICS not ready yet.");
      return;
    }
    var runs = window.MARIO_METRICS.exportAll();
    var blob = new Blob([JSON.stringify(runs, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mario_runs.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log("⬇️ Downloaded mario_runs.json");
  });

  document.getElementById("btnClearRuns").addEventListener("click", function () {
    if (window.MARIO_METRICS && window.MARIO_METRICS.clearAll) {
      window.MARIO_METRICS.clearAll();
    } else {
      localStorage.removeItem("mario_runs");
      console.log("🧹 Cleared mario_runs");
    }
  });
})();

// =========================================================
// Clean reset between loads (prevents powerups/items persisting)
// =========================================================
window.__RESET_WORLD_STATE = function () {
  // Clear transient lists used by game loop
  updateables = [];
  fireballs = [];

  // Reset viewport so reload doesn't “jump”
  vX = 0;
  vY = 0;

  // Hard reset player object (prevents powerup persistence)
  player = new Mario.Player([0, 0]);

  // Clear any stale references
  window.level = null;
};

// Convenience loader (world selector can call this if you want)
window.MARIO_LOAD_LEVEL = function (loaderFn, opts) {
  if (typeof loaderFn !== "function") {
    console.warn("MARIO_LOAD_LEVEL: loaderFn is not a function");
    return;
  }
  window.__RESET_WORLD_STATE();
  loaderFn(opts || {});
  if (typeof window.__PCG_HUD_UPDATE === "function") window.__PCG_HUD_UPDATE();
};

//initialize
var lastTime;
function init() {
  music = {
    overworld: new Audio("sounds/aboveground_bgm.ogg"),
    underground: new Audio("sounds/underground_bgm.ogg"),
    clear: new Audio("sounds/stage_clear.wav"),
    death: new Audio("sounds/mariodie.wav"),
  };
  sounds = {
    smallJump: new Audio("sounds/jump-small.wav"),
    bigJump: new Audio("sounds/jump-super.wav"),
    breakBlock: new Audio("sounds/breakblock.wav"),
    bump: new Audio("sounds/bump.wav"),
    coin: new Audio("sounds/coin.wav"),
    fireball: new Audio("sounds/fireball.wav"),
    flagpole: new Audio("sounds/flagpole.wav"),
    kick: new Audio("sounds/kick.wav"),
    pipe: new Audio("sounds/pipe.wav"),
    itemAppear: new Audio("sounds/itemAppear.wav"),
    powerup: new Audio("sounds/powerup.wav"),
    stomp: new Audio("sounds/stomp.wav"),
  };

  // IMPORTANT:
  // If you are using the world selector overlay, do NOT auto-start.
  // World selector will call the level loader for you.
  var hasWorldSelector = !!document.getElementById("worldSelectOverlay");
  if (!hasWorldSelector) {
    // fallback: start default 1-1 baseline
    if (window.Mario && typeof Mario.oneone === "function") {
      Mario.oneone();
    } else if (window.Mario && typeof Mario.oneone_v2 === "function") {
      Mario.oneone_v2({ evolve: false });
    }
  }

  lastTime = Date.now();
  main();
}

var gameTime = 0;

//set up the game loop
function main() {
  var now = Date.now();
  var dt = (now - lastTime) / 1000.0;

  update(dt);
  render();

  lastTime = now;
  requestAnimFrame(main);
}

function update(dt) {
  gameTime += dt;

  // If no level yet (waiting for world selector), don't update
  if (!level) return;

  handleInput(dt);
  updateEntities(dt, gameTime);

  checkCollisions();
}

function handleInput(dt) {
  if (player.piping || player.dying || player.noInput) return; //don't accept input

  if (input.isDown("RUN")) {
    player.run();
  } else {
    player.noRun();
  }
  if (input.isDown("JUMP")) {
    player.jump();
  } else {
    player.noJump();
  }

  if (input.isDown("DOWN")) {
    player.crouch();
  } else {
    player.noCrouch();
  }

  if (input.isDown("LEFT")) {
    player.moveLeft();
  } else if (input.isDown("RIGHT")) {
    player.moveRight();
  } else {
    player.noWalk();
  }
}

//update all the moving stuff
function updateEntities(dt, gameTime) {
  player.update(dt, vX);
  updateables.forEach(function (ent) {
    ent.update(dt, gameTime);
  });

  if (player.exiting) {
    if (player.pos[0] > vX + 96) vX = player.pos[0] - 96;
  } else if (level.scrolling && player.pos[0] > vX + 80) {
    vX = player.pos[0] - 80;
  }

  if (player.powering.length !== 0 || player.dying) {
    return;
  }
  level.items.forEach(function (ent) {
    ent.update(dt);
  });

  level.enemies.forEach(function (ent) {
    ent.update(dt, vX);
  });

  fireballs.forEach(function (fireball) {
    fireball.update(dt);
  });
  level.pipes.forEach(function (pipe) {
    pipe.update(dt);
  });
}

//scan for collisions
function checkCollisions() {
  if (player.powering.length !== 0 || player.dying) {
    return;
  }
  player.checkCollisions();

  level.items.forEach(function (item) {
    item.checkCollisions();
  });
  level.enemies.forEach(function (ent) {
    ent.checkCollisions();
  });
  fireballs.forEach(function (fireball) {
    fireball.checkCollisions();
  });
  level.pipes.forEach(function (pipe) {
    pipe.checkCollisions();
  });
}

//draw the game!
function render() {
  updateables = [];

  if (!level) {
    // show black background while waiting
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = level.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  //scenery gets drawn first
  for (var i = 0; i < 15; i++) {
    for (
      var j = Math.floor(vX / 16) - 1;
      j < Math.floor(vX / 16) + 20;
      j++
    ) {
      if (level.scenery[i][j]) {
        renderEntity(level.scenery[i][j]);
      }
    }
  }

  level.items.forEach(function (item) {
    renderEntity(item);
  });

  level.enemies.forEach(function (enemy) {
    renderEntity(enemy);
  });

  fireballs.forEach(function (fireball) {
    renderEntity(fireball);
  });

  for (var i2 = 0; i2 < 15; i2++) {
    for (
      var j2 = Math.floor(vX / 16) - 1;
      j2 < Math.floor(vX / 16) + 20;
      j2++
    ) {
      if (level.statics[i2][j2]) {
        renderEntity(level.statics[i2][j2]);
      }
      if (level.blocks[i2][j2]) {
        renderEntity(level.blocks[i2][j2]);
        updateables.push(level.blocks[i2][j2]);
      }
    }
  }

  if (player.invincibility % 2 === 0) {
    renderEntity(player);
  }

  level.pipes.forEach(function (pipe) {
    renderEntity(pipe);
  });
}

function renderEntity(entity) {
  entity.render(ctx, vX, vY);
}
