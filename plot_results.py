import json
import pandas as pd
import matplotlib.pyplot as plt

# Load data
with open("mario_data.json") as f:
    runs = json.load(f)

df = pd.json_normalize(runs)

# Keep only PCG runs
df = df[df["mode"] == "pcg"]

# Convenience columns
df["enemies"] = df["metrics.enemies"]
df["gaps"] = df["metrics.gaps"]
df["blocks"] = df["metrics.blocks"]
df["pipes"] = df["metrics.pipes"]

# -------- Plot 1: Enemy count --------
plt.figure()
df.boxplot(column="enemies", by="file_id")
plt.title("Enemy Count per Experiment")
plt.suptitle("")
plt.xlabel("Generator Version")
plt.ylabel("Enemies")
plt.show()

# -------- Plot 2: Gap count --------
plt.figure()
df.boxplot(column="gaps", by="file_id")
plt.title("Gap Count per Experiment")
plt.suptitle("")
plt.xlabel("Generator Version")
plt.ylabel("Gaps")
plt.show()

# -------- Plot 3: Object density --------
summary = df.groupby("file_id")[["enemies","blocks","pipes"]].mean()
summary.plot(kind="bar")
plt.title("Average Object Counts")
plt.ylabel("Count")
plt.xlabel("Generator Version")
plt.show()

# -------- Plot 4: Variance --------
variance = df.groupby("file_id")[["enemies","gaps"]].std()
variance.plot(kind="bar")
plt.title("Variance of Key Metrics")
plt.ylabel("Standard Deviation")
plt.xlabel("Generator Version")
plt.show()
