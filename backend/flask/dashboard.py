from phoenix.client import Client
import pandas as pd
import json

# 1️⃣ Connect and fetch
client = Client(base_url="http://localhost:6006")
df = client.spans.get_spans_dataframe(project_name="default")

# 2️⃣ Process data
df["duration_sec"] = (df["end_time"] - df["start_time"]).dt.total_seconds().round(2)
rag = df[df["name"] == "rag_chat_request"].copy()
rag["hour"] = rag["start_time"].dt.floor("h").astype(str)
rag["user"] = rag["attributes.user.id"].fillna("anonymous")
rag["question"] = rag["attributes.input.value"].fillna("").str[:50]
rag["time"] = rag["start_time"].astype(str).str[:19]

# 3️⃣ Build chart data
hourly = rag.groupby("hour")["duration_sec"].agg(["count", "mean"]).round(2).reset_index()
hourly.columns = ["hour", "count", "avg_latency"]

per_user = rag.groupby("user")["duration_sec"].agg(["count", "mean"]).round(2).reset_index()
per_user.columns = ["user", "count", "avg_latency"]

recent = rag[["time", "question", "duration_sec", "user"]].tail(10).to_dict("records")

# Summary stats
stats = {
    "total":   int(len(rag)),
    "avg":     round(float(rag["duration_sec"].mean()), 1),
    "fastest": round(float(rag["duration_sec"].min()), 1),
    "slowest": round(float(rag["duration_sec"].max()), 1),
}

# 4️⃣ Generate HTML dashboard
html = f"""<!DOCTYPE html>
<html>
<head>
  <title>RAG Chatbot Metrics</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{ font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px; }}
    h1 {{ font-size: 24px; color: #38bdf8; margin-bottom: 24px; }}
    h2 {{ font-size: 16px; color: #94a3b8; margin-bottom: 12px; }}
    .grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }}
    .card {{ background: #1e293b; border-radius: 12px; padding: 20px; text-align: center; }}
    .card .value {{ font-size: 36px; font-weight: bold; color: #38bdf8; }}
    .card .label {{ font-size: 13px; color: #64748b; margin-top: 4px; }}
    .charts {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }}
    .chart-box {{ background: #1e293b; border-radius: 12px; padding: 20px; }}
    .table-box {{ background: #1e293b; border-radius: 12px; padding: 20px; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
    th {{ text-align: left; padding: 8px 12px; color: #64748b; border-bottom: 1px solid #334155; }}
    td {{ padding: 8px 12px; border-bottom: 1px solid #1e293b; }}
    tr:hover td {{ background: #0f172a; }}
    .fast {{ color: #4ade80; }} .slow {{ color: #f87171; }} .mid {{ color: #fbbf24; }}
  </style>
</head>
<body>
  <h1>⚽ RAG Chatbot — Metrics Dashboard</h1>

  <!-- Summary Cards -->
  <div class="grid">
    <div class="card"><div class="value">{stats["total"]}</div><div class="label">Total Requests</div></div>
    <div class="card"><div class="value">{stats["avg"]}s</div><div class="label">Avg Latency</div></div>
    <div class="card"><div class="value fast">{stats["fastest"]}s</div><div class="label">Fastest</div></div>
    <div class="card"><div class="value slow">{stats["slowest"]}s</div><div class="label">Slowest</div></div>
  </div>

  <!-- Charts -->
  <div class="charts">
    <div class="chart-box">
      <h2>📈 Requests per Hour</h2>
      <canvas id="hourlyChart"></canvas>
    </div>
    <div class="chart-box">
      <h2>👤 Requests per User</h2>
      <canvas id="userChart"></canvas>
    </div>
  </div>

  <!-- Recent Requests Table -->
  <div class="table-box">
    <h2>🕐 Recent Requests</h2>
    <table>
      <thead><tr><th>Time</th><th>Question</th><th>User</th><th>Latency</th></tr></thead>
      <tbody>
        {"".join(f'''<tr>
          <td>{r["time"]}</td>
          <td>{r["question"]}</td>
          <td>{r["user"][:20]}</td>
          <td class="{"fast" if r["duration_sec"] < 10 else "slow" if r["duration_sec"] > 20 else "mid"}">{r["duration_sec"]}s</td>
        </tr>''' for r in recent)}
      </tbody>
    </table>
  </div>

  <script>
    // Hourly chart
    new Chart(document.getElementById("hourlyChart"), {{
      type: "bar",
      data: {{
        labels: {json.dumps(hourly["hour"].tolist())},
        datasets: [
          {{ label: "Requests", data: {json.dumps(hourly["count"].tolist())}, backgroundColor: "#38bdf8" }},
          {{ label: "Avg Latency (s)", data: {json.dumps(hourly["avg_latency"].tolist())}, backgroundColor: "#818cf8", type: "line", yAxisID: "y2" }}
        ]
      }},
      options: {{
        responsive: true,
        scales: {{
          y:  {{ beginAtZero: true, ticks: {{ color: "#94a3b8" }}, grid: {{ color: "#1e293b" }} }},
          y2: {{ beginAtZero: true, position: "right", ticks: {{ color: "#94a3b8" }}, grid: {{ drawOnChartArea: false }} }},
          x:  {{ ticks: {{ color: "#94a3b8" }}, grid: {{ color: "#334155" }} }}
        }},
        plugins: {{ legend: {{ labels: {{ color: "#e2e8f0" }} }} }}
      }}
    }});

    // User chart
    new Chart(document.getElementById("userChart"), {{
      type: "doughnut",
      data: {{
        labels: {json.dumps(per_user["user"].str[:20].tolist())},
        datasets: [{{ 
          data: {json.dumps(per_user["count"].tolist())},
          backgroundColor: ["#38bdf8", "#818cf8", "#4ade80", "#fbbf24", "#f87171"]
        }}]
      }},
      options: {{
        responsive: true,
        plugins: {{ legend: {{ labels: {{ color: "#e2e8f0" }} }} }}
      }}
    }});
  </script>
</body>
</html>"""

# 5️⃣ Save dashboard
with open("dashboard.html", "w", encoding="utf-8") as f:
    f.write(html)

print("✅ Dashboard saved to dashboard.html")
print("👉 Open it in your browser!")