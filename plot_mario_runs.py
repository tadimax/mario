import json
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt

JSON_PATH = Path("mario_runs_11_v2_beats.json")   # <-- rename if needed
OUT_DIR = Path("plots")
OUT_DIR.mkdir(exist_ok=True)

def load_runs(path: Path) -> pd.DataFrame:
    runs = json.loads(path.read_text(encoding="utf-8"))
    df = pd.json_normalize(runs)

    # Common columns (your logger might use either of these)
    # Make a consistent set:
    rename_map = {
        "metrics.floors": "floors",
        "metrics.floorTiles": "floors",
        "metrics.gaps": "gaps",
        "metrics.enemies": "enemies",
        "metrics.blocks": "blocks",
        "metrics.pipes": "pipes",
    }
    for src, dst in rename_map.items():
        if src in df.columns and dst not in df.columns:
            df[dst] = df[src]

    # Fill missing numeric metrics with 0 (safe for plotting)
    for col in ["floors", "gaps", "enemies", "blocks", "pipes"]:
        if col not in df.columns:
            df[col] = 0
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

    # Make sure these exist
    for col in ["file_id", "generator_version", "mode", "level_id"]:
        if col not in df.columns:
            df[col] = "unknown"

    if "seed" not in df.columns:
        df["seed"] = None

    # Optional: de-dup if your game is logging multiple times per reload.
    # Keep one entry per (timestamp, file_id, seed, mode). If timestamp repeats a lot, also include metrics.
    if "timestamp" in df.columns:
        df["timestamp"] = df["timestamp"].astype(str)
        df = df.drop_duplicates(subset=["timestamp", "file_id", "seed", "mode", "floors", "gaps", "enemies", "blocks", "pipes"])

    # A label used for grouping experiments
    # Example: 11_v2_beats / 11_v2_beats_4 / ...
    df["experiment"] = df["file_id"].astype(str)

    return df

def save_boxplot(df, metric: str, title: str, filename: str):
    # group by experiment + mode so baseline vs pcg shows up separately
    df2 = df.copy()
    df2["group"] = df2["experiment"].astype(str) + " | " + df2["mode"].astype(str)

    groups = []
    labels = []
    for g, sub in df2.groupby("group", sort=True):
        groups.append(sub[metric].values)
        labels.append(g)

    plt.figure()
    plt.boxplot(groups, labels=labels, showfliers=False)
    plt.xticks(rotation=75, ha="right")
    plt.title(title)
    plt.ylabel(metric)
    plt.tight_layout()
    plt.savefig(OUT_DIR / filename, dpi=200)
    plt.close()

def save_scatter(df, xcol: str, ycol: str, title: str, filename: str):
    plt.figure()
    # Plot each experiment separately (legend-free to keep it readable)
    for exp, sub in df.groupby("experiment", sort=True):
        plt.scatter(sub[xcol], sub[ycol], label=exp, alpha=0.6)

    plt.title(title)
    plt.xlabel(xcol)
    plt.ylabel(ycol)
    plt.tight_layout()
    plt.savefig(OUT_DIR / filename, dpi=200)
    plt.close()

def save_counts_bar(df, title: str, filename: str):
    counts = df.groupby(["experiment", "mode"], sort=True).size().reset_index(name="runs")
    # Make a compact label
    counts["label"] = counts["experiment"].astype(str) + " | " + counts["mode"].astype(str)

    plt.figure()
    plt.bar(counts["label"], counts["runs"])
    plt.xticks(rotation=75, ha="right")
    plt.title(title)
    plt.ylabel("runs")
    plt.tight_layout()
    plt.savefig(OUT_DIR / filename, dpi=200)
    plt.close()

def main():
    df = load_runs(JSON_PATH)

    # Quick sanity print so you can confirm counts
    print("Loaded runs:", len(df))
    print(df[["experiment", "mode"]].value_counts().sort_index())

    # Core plots
    save_counts_bar(df, "Runs per experiment/mode", "runs_per_experiment.png")

    save_boxplot(df, "enemies", "Enemy count distribution", "enemies_boxplot.png")
    save_boxplot(df, "gaps", "Gap count distribution", "gaps_boxplot.png")
    save_boxplot(df, "floors", "Floor/ground amount distribution", "floors_boxplot.png")
    save_boxplot(df, "blocks", "Block count distribution", "blocks_boxplot.png")
    save_boxplot(df, "pipes", "Pipe count distribution", "pipes_boxplot.png")

    save_scatter(df, "gaps", "enemies", "Enemies vs gaps (all runs)", "scatter_enemies_vs_gaps.png")

    # Optional: summary table CSV (nice for paper)
    summary = df.groupby(["experiment", "mode"], sort=True)[["floors","gaps","enemies","blocks","pipes"]].agg(["mean","std","median","min","max"])
    summary.to_csv(OUT_DIR / "summary_stats.csv")
    print("Wrote plots/ and summary_stats.csv")

if __name__ == "__main__":
    main()
