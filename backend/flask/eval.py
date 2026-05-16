from phoenix.client import Client
import pandas as pd
import requests
import json
import re

# 1️⃣ Connect to Phoenix
client = Client(base_url="http://localhost:6006")

# 2️⃣ Pull spans
print("📥 Fetching spans from Phoenix...")
spans_df = client.spans.get_spans_dataframe(project_name="default")

# 3️⃣ Filter only root RAG spans
rag_spans = spans_df[spans_df["name"] == "rag_chat_request"].copy()
rag_spans = rag_spans.dropna(subset=["attributes.input.value", "attributes.output.value"])

print(f"✅ Found {len(rag_spans)} RAG spans to evaluate\n")

# 4️⃣ Scoring function
def score_with_ollama(question, answer):
    prompt = f"""You are a strict evaluator. Score the chatbot answer below.
Reply ONLY with this JSON. No extra text, no markdown, no explanation outside the JSON.

{{"relevance": {{"score": 8, "reason": "example reason"}}, "hallucination": {{"score": 7, "reason": "example reason"}}, "quality": {{"score": 9, "reason": "example reason"}}}}

Now score this:

Question: {question}
Answer: {answer[:300]}

Reply ONLY with the JSON object:"""

    response = requests.post(
        "http://localhost:11434/api/chat",
        json={
            "model": "llama3",
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "options": {"temperature": 0.0, "num_predict": 200}
        }
    )

    raw = response.json()["message"]["content"].strip()
    print(f"   🔎 Raw response: {raw[:200]}")  # debug: see what LLaMA3 returns

    # Remove markdown code fences if present
    raw = re.sub(r"```json|```", "", raw).strip()

    # Extract first { ... } block
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in response")

    json_str = match.group()

    # Fix common LLaMA3 JSON issues
    # Remove trailing commas before } or ]
    json_str = re.sub(r",\s*([}\]])", r"\1", json_str)
    # Replace smart quotes
    json_str = json_str.replace("\u201c", '"').replace("\u201d", '"')

    return json.loads(json_str)


# 5️⃣ Run evaluations
results = []

for idx, row in rag_spans.iterrows():
    question = row["attributes.input.value"]
    answer   = row["attributes.output.value"]

    print(f"🔍 Evaluating: '{question[:50]}'")

    try:
        scores = score_with_ollama(question, answer)

        results.append({
            "span_id":              idx,
            "question":             question,
            "answer":               answer[:100],
            "relevance_score":      scores["relevance"]["score"],
            "relevance_reason":     scores["relevance"]["reason"],
            "hallucination_score":  scores["hallucination"]["score"],
            "hallucination_reason": scores["hallucination"]["reason"],
            "quality_score":        scores["quality"]["score"],
            "quality_reason":       scores["quality"]["reason"],
        })

        print(f"   ✅ Relevance:     {scores['relevance']['score']}/10 — {scores['relevance']['reason']}")
        print(f"   ✅ Hallucination: {scores['hallucination']['score']}/10 — {scores['hallucination']['reason']}")
        print(f"   ✅ Quality:       {scores['quality']['score']}/10 — {scores['quality']['reason']}\n")

    except Exception as e:
        print(f"   ❌ Error: {e}\n")

# 6️⃣ Summary
results_df = pd.DataFrame(results)

if not results_df.empty:
    print("=" * 60)
    print("📊 EVALUATION SUMMARY")
    print("=" * 60)
    print(f"Avg Relevance Score:     {results_df['relevance_score'].mean():.1f}/10")
    print(f"Avg Hallucination Score: {results_df['hallucination_score'].mean():.1f}/10")
    print(f"Avg Quality Score:       {results_df['quality_score'].mean():.1f}/10")
    print("\n📋 Full Results:")
    print(results_df[["question", "relevance_score", "hallucination_score", "quality_score"]])

    results_df.to_csv("eval_results.csv", index=False)
    print("\n💾 Results saved to eval_results.csv")
else:
    print("❌ No results — all spans failed to evaluate")

# 7️⃣ Push eval scores back to Phoenix
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
import time

print("\n📤 Pushing scores to Phoenix...")

provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:6006/v1/traces"))
)
eval_tracer = trace.get_tracer("evaluator")
trace.set_tracer_provider(provider)

for result in results:
    with eval_tracer.start_as_current_span("eval.scores") as span:
        span.set_attribute("eval.question",             result["question"])
        span.set_attribute("eval.relevance_score",      result["relevance_score"])
        span.set_attribute("eval.relevance_reason",     result["relevance_reason"])
        span.set_attribute("eval.hallucination_score",  result["hallucination_score"])
        span.set_attribute("eval.hallucination_reason", result["hallucination_reason"])
        span.set_attribute("eval.quality_score",        result["quality_score"])
        span.set_attribute("eval.quality_reason",       result["quality_reason"])
        time.sleep(0.1)  # let spans flush

print("✅ Scores pushed to Phoenix!")
print("👉 Open http://localhost:6006 → Spans tab → filter by name = 'eval.scores'")

# Add this at the bottom of eval.py
print("\n⏱️ LATENCY BREAKDOWN")
print("=" * 60)

latency_df = spans_df.copy()
latency_df["duration_ms"] = (
    (latency_df["end_time"] - latency_df["start_time"])
    .dt.total_seconds() * 1000
).round(1)

latency_summary = (
    latency_df.groupby("name")["duration_ms"]
    .agg(["mean", "min", "max", "count"])
    .round(1)
)
latency_summary.columns = ["avg_ms", "min_ms", "max_ms", "count"]
latency_summary["avg_sec"] = (latency_summary["avg_ms"] / 1000).round(1)

print(latency_summary[["count", "avg_sec", "min_ms", "max_ms"]])