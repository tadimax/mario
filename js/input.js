// js/input.js
(function () {
  var pressedKeys = {};
  var toggleLock = false;

  // global flag: baseline by default
  if (typeof window.MARIO_EVOLVE === "undefined") {
    window.MARIO_EVOLVE = false;
  }

  function keyName(code) {
    switch (code) {
      case 32: return "SPACE";
      case 37: return "LEFT";
      case 38: return "UP";
      case 39: return "RIGHT";
      case 40: return "DOWN";
      case 88: return "JUMP"; // X
      case 90: return "RUN";  // Z
      case 84: return "TOGGLE"; // T
      default: return String.fromCharCode(code);
    }
  }

  function setKey(event, status) {
    var key = keyName(event.keyCode);
    pressedKeys[key] = status;
    return key;
  }

  function reloadLevel() {
    // Reload 1-1 immediately so you can see the black/blue sky change
    if (window.Mario && typeof Mario.oneone === "function") {
      Mario.oneone({ evolve: !!window.MARIO_EVOLVE });
    }
  }

  document.addEventListener("keydown", function (e) {
    var key = setKey(e, true);

    if (key === "TOGGLE") {
      if (!toggleLock) {
        toggleLock = true;
        window.MARIO_EVOLVE = !window.MARIO_EVOLVE;
        console.log("PCG TOGGLE:", window.MARIO_EVOLVE ? "ON (black sky)" : "OFF (blue sky)");
        reloadLevel();
      }
      e.preventDefault();
      return;
    }
  });

  document.addEventListener("keyup", function (e) {
    var key = setKey(e, false);
    if (key === "TOGGLE") {
      toggleLock = false;
      e.preventDefault();
    }
  });

  window.addEventListener("blur", function () {
    pressedKeys = {};
    toggleLock = false;
  });

  window.input = {
    isDown: function (key) {
      return pressedKeys[key.toUpperCase()];
    },
    reset: function () {
      pressedKeys["RUN"] = false;
      pressedKeys["LEFT"] = false;
      pressedKeys["RIGHT"] = false;
      pressedKeys["DOWN"] = false;
      pressedKeys["JUMP"] = false;
      pressedKeys["TOGGLE"] = false;
    }
  };
})();
