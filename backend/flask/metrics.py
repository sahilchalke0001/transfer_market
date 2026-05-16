from phoenix.client import Client
import pandas as pd

# 1️⃣ Connect to Phoenix
client = Client(base_url="http://localhost:6006")

# 2️⃣ Pull all spans
print("📥 Fetching spans...")
df = client.spans.get_spans_dataframe(project_name="default")

# 3️⃣ Calculate duration
df["duration_sec"] = (
    (df["end_time"] - df["start_time"])
    .dt.total_seconds()
).round(2)

# 4️⃣ Filter only root RAG spans
rag = df[df["name"] == "rag_chat_request"].copy()
rag["hour"] = rag["start_time"].dt.floor("h")

print(f"\n✅ Total RAG requests: {len(rag)}")
print(f"⏱️  Avg latency:        {rag['duration_sec'].mean():.1f}s")
print(f"⚡ Fastest response:   {rag['duration_sec'].min():.1f}s")
print(f"🐢 Slowest response:   {rag['duration_sec'].max():.1f}s")

print("\n📊 Requests per hour:")
print(rag.groupby("hour")["duration_sec"].agg(["count", "mean"]).round(2))

print("\n👤 Requests per user:")
print(rag.groupby("attributes.user.id")["duration_sec"].agg(["count", "mean"]).round(2))