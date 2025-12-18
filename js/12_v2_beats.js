// js/levels/12_v2_beats.js
// World 1-2 (V2): fixed seed PCG level for reproducible evaluation
console.log("✅ LOADED js/levels/12_v2_beats.js");

(function () {
  // Reuse Mario.oneone_v2 generator by calling it with a fixed seed and different width.
  // Keep this seed stable for your reported experiments.
  const FIXED_SEED_12 = 20220012;

  Mario.onetwo_v2 = function () {
    window.MARIO_EVOLVE = true;
    window.MARIO_EVOLVE_SEED = FIXED_SEED_12;

    // seed display if overlay exists
    const el = document.getElementById("seedDisplay");
    if (el) el.textContent = String(FIXED_SEED_12);

    // Build as PCG using V2 generator, but with a different loader identity.
    // If you want different geometry width, easiest is to keep it 212 for now.
    if (typeof Mario.oneone_v2 === "function") {
      Mario.oneone_v2({ evolve: true, seed: FIXED_SEED_12 });
    } else {
      console.warn("Mario.oneone_v2 not found. Did you include js/levels/11_v2_beats.js first?");
    }
  };
})();
