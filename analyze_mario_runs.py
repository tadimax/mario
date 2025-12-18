#!/usr/bin/env python3
"""
Analyze Mario.js PCG experiment logs exported from localStorage.

Expected input:
  - JSON list of run entries (the value of localStorage key "mario_runs")
  - OR object with {"runs": [...]}.

This script is deliberately forgiving: it can read either the newer
"features" schema or the earlier compact "metrics" schema.

Key improvements (refactor):
  - Default input filename is mario_data.json (positional arg optional)
  - Default mode is 'all' (so baseline / ga / pcg aren't silently filtered out)
  - When mode='all', groups are split by (file_id + ":" + mode) so baseline
    shows up as its own series rather than being mixed in.
  - Prints a breakdown so you can see why you might only get 2 groups.

Usage:
  python analyze_mario_runs.py
  python analyze_mario_runs.py mario_data.json
  python analyze_mario_runs.py mario_data.json --mode all --outdir out
  python analyze_mario_runs.py mario_data.json --mode pcg --outdir out
  python analyze_mario_runs.py --list
"""

from __future__ import annotations

import argparse
import json
import math
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import matplotlib.pyplot as plt


def _safe_get(d: Dict[str, Any], path: List[str], default=None):
    cur: Any = d
    for k in path:
        if not isinstance(cur, dict) or k not in cur:
            return default
        cur = cur[k]
    return cur


def _as_str(x: Any, default: str = "") -> str:
    if x is None:
        return default
    try:
        s = str(x)
    except Exception:
        return default
    return s if s.strip() else default


def _infer_file_id(r: Dict[str, Any]) -> str:
    # Try a bunch of plausible keys across versions
    candidates = [
        r.get("file_id"),
        r.get("fileId"),
        r.get("file"),
        r.get("experiment_id"),
        r.get("experimentId"),
        r.get("experiment"),
        r.get("generator_version"),
        _safe_get(r, ["meta", "file_id"]),
        _safe_get(r, ["meta", "experiment"]),
    ]
    for c in candidates:
        s = _as_str(c, "")
        if s:
            return s
    return "unknown"


def _infer_mode(r: Dict[str, Any]) -> str:
    candidates = [
        r.get("mode"),
        r.get("run_mode"),
        r.get("runMode"),
        _safe_get(r, ["meta", "mode"]),
    ]
    for c in candidates:
        s = _as_str(c, "")
        if s:
            return s
    return "unknown"


@dataclass
class RunRow:
    file_id: str
    mode: str
    seed: Optional[int]
    width_tiles: int
    floors: float
    gaps: float
    enemies: float
    blocks: float
    pipes: float
    divergence: Optional[float]


def parse_runs(raw: Any, default_width: int = 212) -> List[RunRow]:
    if isinstance(raw, dict) and "runs" in raw and isinstance(raw["runs"], list):
        raw_runs = raw["runs"]
    elif isinstance(raw, list):
        raw_runs = raw
    else:
        raise ValueError("Input JSON must be a list (or an object with key 'runs').")

    out: List[RunRow] = []
    for r in raw_runs:
        if not isinstance(r, dict):
            continue

        file_id = _infer_file_id(r)
        mode = _infer_mode(r)

        seed = r.get("seed")
        if isinstance(seed, float):
            seed = int(seed)
        if not isinstance(seed, int):
            seed = None

        # Newer schema: entry.features.{width_tiles, enemies{count}, gaps{count}, objects{pipes}, ...}
        width_tiles = _safe_get(r, ["features", "width_tiles"], default_width)
        try:
            width_tiles = int(width_tiles)
        except Exception:
            width_tiles = default_width

        enemies = _safe_get(r, ["features", "enemies", "count"], None)
        gaps = _safe_get(r, ["features", "gaps", "count"], None)
        pipes = _safe_get(r, ["features", "objects", "pipes"], None)
        blocks = _safe_get(r, ["features", "objects", "bricks"], None)
        floors = _safe_get(r, ["features", "floor_tiles"], None)
        divergence = _safe_get(r, ["features", "tile_column_hamming_vs_baseline"], None)

        # Compact schema: entry.metrics.{floors,gaps,enemies,blocks,pipes}
        if enemies is None:
            enemies = _safe_get(r, ["metrics", "enemies"], 0)
        if gaps is None:
            gaps = _safe_get(r, ["metrics", "gaps"], 0)
        if blocks is None:
            blocks = _safe_get(r, ["metrics", "blocks"], 0)
        if pipes is None:
            pipes = _safe_get(r, ["metrics", "pipes"], 0)
        if floors is None:
            floors = _safe_get(r, ["metrics", "floors"], 0)

        def f(x, default=0.0):
            try:
                if x is None:
                    return default
                return float(x)
            except Exception:
                return default

        enemies_f = f(enemies)
        gaps_f = f(gaps)
        blocks_f = f(blocks)
        pipes_f = f(pipes)
        floors_f = f(floors)
        div_f = None if divergence is None else f(divergence, default=None)

        out.append(
            RunRow(
                file_id=file_id,
                mode=mode,
                seed=seed,
                width_tiles=width_tiles,
                floors=floors_f,
                gaps=gaps_f,
                enemies=enemies_f,
                blocks=blocks_f,
                pipes=pipes_f,
                divergence=div_f,
            )
        )
    return out


def mean_std(vals: List[float]) -> Tuple[float, float]:
    if not vals:
        return 0.0, 0.0
    m = sum(vals) / len(vals)
    var = sum((v - m) ** 2 for v in vals) / max(1, (len(vals) - 1))
    return m, math.sqrt(var)


def _summarize(rows: List[RunRow]) -> Dict[str, int]:
    by_mode: Dict[str, int] = {}
    by_file: Dict[str, int] = {}
    for r in rows:
        by_mode[r.mode] = by_mode.get(r.mode, 0) + 1
        by_file[r.file_id] = by_file.get(r.file_id, 0) + 1
    return {"modes": len(by_mode), "files": len(by_file)}


def print_breakdown(rows: List[RunRow]):
    by_mode: Dict[str, int] = {}
    by_file: Dict[str, int] = {}
    by_pair: Dict[str, int] = {}
    for r in rows:
        by_mode[r.mode] = by_mode.get(r.mode, 0) + 1
        by_file[r.file_id] = by_file.get(r.file_id, 0) + 1
        key = f"{r.file_id}:{r.mode}"
        by_pair[key] = by_pair.get(key, 0) + 1

    print("\n=== Breakdown ===")
    print("Runs by mode:")
    for k in sorted(by_mode.keys()):
        print(f"  {k:>12} : {by_mode[k]}")
    print("Runs by file_id:")
    for k in sorted(by_file.keys()):
        print(f"  {k:>12} : {by_file[k]}")
    print("Runs by file_id:mode:")
    for k in sorted(by_pair.keys()):
        print(f"  {k:>20} : {by_pair[k]}")
    print("=== End breakdown ===\n")


def group_runs(
    rows: List[RunRow],
    mode_filter: Optional[str],
    split_by_mode_when_all: bool = True,
) -> Dict[str, List[RunRow]]:
    g: Dict[str, List[RunRow]] = {}
    for r in rows:
        if mode_filter and r.mode != mode_filter:
            continue

        # If we're not filtering (mode=all), split series so baseline isn't mixed with pcg.
        if mode_filter is None and split_by_mode_when_all:
            key = f"{r.file_id}:{r.mode}"
        else:
            key = r.file_id

        g.setdefault(key, []).append(r)

    return dict(sorted(g.items(), key=lambda kv: kv[0]))


def save_summary_csv(groups: Dict[str, List[RunRow]], outpath: str):
    import csv

    with open(outpath, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow([
            "experiment",
            "n",
            "gaps_mean",
            "gaps_std",
            "enemies_per100_mean",
            "enemies_per100_std",
            "pipes_mean",
            "pipes_std",
            "blocks_mean",
            "blocks_std",
            "divergence_mean",
            "divergence_std",
        ])
        for exp, rows in groups.items():
            gaps = [r.gaps for r in rows]
            enemies100 = [(r.enemies / r.width_tiles) * 100.0 for r in rows if r.width_tiles > 0]
            pipes = [r.pipes for r in rows]
            blocks = [r.blocks for r in rows]
            divs = [r.divergence for r in rows if r.divergence is not None]

            gm, gs = mean_std(gaps)
            em, es = mean_std(enemies100)
            pm, ps = mean_std(pipes)
            bm, bs = mean_std(blocks)
            dm, ds = mean_std([float(x) for x in divs]) if divs else (0.0, 0.0)

            w.writerow([exp, len(rows), gm, gs, em, es, pm, ps, bm, bs, dm, ds])


def boxplot_metric(groups: Dict[str, List[RunRow]], values_fn, title: str, ylabel: str, outpath: str):
    labels = list(groups.keys())
    data = [values_fn(groups[l]) for l in labels]

    plt.figure(figsize=(10, 5))
    plt.boxplot(data, labels=labels, vert=True, showfliers=False)
    plt.title(title)
    plt.ylabel(ylabel)
    plt.xticks(rotation=25, ha="right")
    plt.tight_layout()
    plt.savefig(outpath, dpi=200)
    plt.close()


def scatter_divergence_vs_enemies(groups: Dict[str, List[RunRow]], outpath: str):
    plt.figure(figsize=(8, 5))
    for exp, rows in groups.items():
        xs = []
        ys = []
        for r in rows:
            if r.divergence is None:
                continue
            xs.append(r.divergence)
            ys.append((r.enemies / r.width_tiles) * 100.0 if r.width_tiles > 0 else 0.0)
        if xs:
            plt.scatter(xs, ys, label=exp, s=18)
    plt.title("Divergence vs enemy density")
    plt.xlabel("Ground-column Hamming vs baseline")
    plt.ylabel("Enemies per 100 tiles")
    plt.legend(fontsize=8, loc="best")
    plt.tight_layout()
    plt.savefig(outpath, dpi=200)
    plt.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "json",
        nargs="?",
        default="mario_data.json",
        help="Exported mario_runs JSON file (default: mario_data.json)",
    )
    ap.add_argument("--outdir", default="out", help="Output directory")
    ap.add_argument(
        "--mode",
        default="all",
        help="Mode filter (e.g., pcg, baseline, ga). Use 'all' to include everything (default).",
    )
    ap.add_argument(
        "--list",
        action="store_true",
        help="Print breakdown of runs found (file_id, mode) and exit.",
    )
    args = ap.parse_args()

    if not os.path.exists(args.json):
        raise SystemExit(f"JSON file not found: {args.json}\nPut mario_data.json next to this script or pass a full path.")

    os.makedirs(args.outdir, exist_ok=True)

    with open(args.json, "r", encoding="utf-8") as f:
        raw = json.load(f)

    rows = parse_runs(raw)
    if not rows:
        raise SystemExit("No valid run objects were parsed from JSON.")

    print_breakdown(rows)
    if args.list:
        return

    mode_filter = None if args.mode == "all" else args.mode

    groups = group_runs(
        rows,
        mode_filter=mode_filter,
        split_by_mode_when_all=True,
    )

    if not groups:
        raise SystemExit("No runs found after filtering. Check your JSON and --mode value.")

    save_summary_csv(groups, os.path.join(args.outdir, "summary.csv"))

    boxplot_metric(
        groups,
        values_fn=lambda rs: [r.gaps for r in rs],
        title="Gap count by experiment",
        ylabel="# gaps",
        outpath=os.path.join(args.outdir, "box_gaps.png"),
    )

    boxplot_metric(
        groups,
        values_fn=lambda rs: [(r.enemies / r.width_tiles) * 100.0 for r in rs if r.width_tiles > 0],
        title="Enemy density by experiment",
        ylabel="Enemies per 100 tiles",
        outpath=os.path.join(args.outdir, "box_enemy_density.png"),
    )

    boxplot_metric(
        groups,
        values_fn=lambda rs: [r.pipes for r in rs],
        title="Pipe count by experiment",
        ylabel="# pipes",
        outpath=os.path.join(args.outdir, "box_pipes.png"),
    )

    boxplot_metric(
        groups,
        values_fn=lambda rs: [r.blocks for r in rs],
        title="Block count by experiment",
        ylabel="# blocks (bricks/qblocks depending on schema)",
        outpath=os.path.join(args.outdir, "box_blocks.png"),
    )

    scatter_divergence_vs_enemies(groups, os.path.join(args.outdir, "scatter_divergence_vs_enemies.png"))

    print(f"Wrote plots + summary.csv to: {args.outdir}")


if __name__ == "__main__":
    main()
