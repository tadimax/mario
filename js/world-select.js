// js/world-select.js
(function () {
  function $(id) { return document.getElementById(id); }

  function setBadge(text) {
    const badge = $("modeBadge");
    if (badge) badge.textContent = "Mode: " + text;
  }

  function hideOverlay() {
    const ov = $("worldSelectOverlay");
    if (ov) ov.style.display = "none";
  }

  // Call a Mario loader safely
  function callLoader(loaderName, opts) {
    if (!window.Mario) {
      console.warn("Mario namespace not found.");
      return;
    }
    const fn = Mario[loaderName];
    if (typeof fn !== "function") {
      console.warn("Loader not found:", loaderName, "Available:", Object.keys(Mario).filter(k => k.includes("oneone") || k.includes("onetwo")).sort());
      return;
    }

    // If you have a wrapper start function, use it; otherwise call directly.
    if (typeof window.MARIO_START_LEVEL === "function") {
      window.MARIO_START_LEVEL(function () { fn(opts || {}); });
    } else {
      fn(opts || {});
    }
  }

  function bindClickAny(ids, handler) {
    let bound = false;
    ids.forEach((id) => {
      const el = $(id);
      if (el) {
        el.addEventListener("click", function (e) {
          e.preventDefault();
          handler();
        });
        bound = true;
      }
    });
    return bound;
  }

  // For reproducible PCG runs we set these globals:
  function start11Baseline(loaderName, label) {
    window.MARIO_EVOLVE = false;
    hideOverlay();
    setBadge(label);
    callLoader(loaderName, { evolve: false });
  }

  function start11PCG(loaderName, label) {
    window.MARIO_EVOLVE = true;

    // New random seed per click, but stored globally so metrics/meta can see it.
    const seed = (Math.floor(Math.random() * 1e9) | 0);
    window.MARIO_EVOLVE_SEED = seed;

    hideOverlay();
    setBadge(label + ", seed " + seed);
    callLoader(loaderName, { evolve: true, seed: seed });
  }

  function start12Seeded(loaderName, label) {
    window.MARIO_EVOLVE = true;
    hideOverlay();
    setBadge(label);
    callLoader(loaderName, {}); // your 1-2 loaders usually read fixed seed internally
  }

  window.addEventListener("load", function () {
    // Helpful: show what loaders exist
    try {
      const loaders = (window.Mario)
        ? Object.keys(Mario).filter(k => k.includes("oneone") || k.includes("onetwo")).sort()
        : [];
      console.log("✅ world-select.js loaded. Available Mario loaders:", loaders);
    } catch {}

    // ---- Baseline 1-1 ----
    // supports old and new ids
    bindClickAny(
      ["btn11Base", "btn11BaseV2", "btn11Baseline", "btn11BaselineV2"],
      function () { start11Baseline("oneone_v2", "World 1-1 baseline (blue sky)"); }
    );

    // ---- PCG experiments 1-1 ----
    // V2 (beats 1-3): Mario.oneone_v2
    bindClickAny(
      ["btn11PCGV2", "btn11PCGV2_3", "btn11PCGV2Beats", "btn11PCGV2Random"],
      function () { start11PCG("oneone_v2", "World 1-1 PCG V2 (beats 1-3)"); }
    );

    // V2_4 (beats 1-4): MUST exist as Mario.oneone_v2_4
    bindClickAny(
      ["btn11PCGV2_4", "btn11PCGV2-4", "btn11PCGV24", "btn11PCGV2_4Random"],
      function () { start11PCG("oneone_v2_4", "World 1-1 PCG V2_4 (beats 1-4)"); }
    );

    // V2_5 (beats 1-5): Mario.oneone_v2_5
    bindClickAny(
      ["btn11PCGV2_5", "btn11PCGV2-5", "btn11PCGV25", "btn11PCGV2_5Random"],
      function () { start11PCG("oneone_v2_5", "World 1-1 PCG V2_5 (beats 1-5)"); }
    );

    // V2_6 (beats 1-6): Mario.oneone_v2_6
    bindClickAny(
      ["btn11PCGV2_6", "btn11PCGV2-6", "btn11PCGV26", "btn11PCGV2_6Random"],
      function () { start11PCG("oneone_v2_6", "World 1-1 PCG V2_6 (beats 1-6)"); }
    );

    // ---- Optional 1-2 buttons (if you have them) ----
    bindClickAny(
      ["btn12Seed", "btn12V2", "btn12SeedV2"],
      function () { start12Seeded("onetwo", "World 1-2 (saved seed)"); }
    );

    setBadge("waiting for selection");
  });
})();
