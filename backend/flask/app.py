import os, datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient, ASCENDING
import requests
from datetime import date, timedelta
from sentence_transformers import SentenceTransformer
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
from langchain_chroma import Chroma
import ollama 

# ─────────────── Phoenix / OpenTelemetry Setup ───────────────
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from openinference.instrumentation.langchain import LangChainInstrumentor
from openinference.instrumentation import using_session
from openinference.semconv.trace import SpanAttributes

PHOENIX_ENDPOINT = "http://localhost:6006/v1/traces"

provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(endpoint=PHOENIX_ENDPOINT)
    )
)
trace.set_tracer_provider(provider)

LangChainInstrumentor().instrument()

tracer = trace.get_tracer(__name__)
# ─────────────────────────────────────────────────────────────

# ─────────────── ENV / DB ───────────────
load_dotenv()

MONGO_URI   = os.getenv("MONGODB_URI")
DB_NAME     = os.getenv("MONGO_DB_NAME", "test")

CHROMA_DIR  = os.getenv("CHROMA_DIR", r"C:\Users\Sahil\Desktop\s\backend\flask\chroma_db")
CHROMA_COLL = os.getenv("CHROMA_COLLECTION_NAME", "documents")
PORT        = int(os.getenv("PORT", 5000))

if not MONGO_URI:
    raise RuntimeError("❌ Missing MONGODB_URI")

# ─────────────── MongoDB Setup ───────────────
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users_col = db.users
chats_col = db.chats
user_chats_col = db.user_chats  
users_col.create_index([("clerkUserId", ASCENDING)], unique=True)
user_chats_col.create_index([("timestamp", ASCENDING)]) 


# ─────────────── AI Objects ───────────────
embedder_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

class LocalEmbeddingWrapper:
    """Wraps a SentenceTransformer to make it LangChain-compatible."""
    def __init__(self, model):
        self.model = model

    def embed_documents(self, texts):
        return [self.model.encode(t, convert_to_tensor=False).tolist() for t in texts]

    def embed_query(self, text):
        return self.model.encode(text, convert_to_tensor=False).tolist()

embeddings = LocalEmbeddingWrapper(embedder_model)


model_name = "google/flan-t5-base"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
chatbot = pipeline("text2text-generation", model=model, tokenizer=tokenizer)


# ─────────────── Chroma Vectorstore ───────────────
vectorstore = Chroma(
    collection_name=CHROMA_COLL,
    embedding_function=embeddings,
    persist_directory=CHROMA_DIR,
)

try:
    test_docs = vectorstore.similarity_search("football", k=2)
    print(f"✅ Connected to Chroma collection '{CHROMA_COLL}' — Retrieved {len(test_docs)} docs.")
except Exception as e:
    print(f"❌ Error connecting to Chroma: {e}")


# ─────────────── Flask App ───────────────
app = Flask(__name__)
CORS(app)


# ----------------- /api/users -----------------
@app.post("/api/users")
def upsert_user():
    data = request.get_json(silent=True) or {}
    clerk_id = data.get("clerkUserId")
    if not clerk_id:
        return jsonify({"message": "Clerk User ID is required."}), 400

    update = {k: v for k, v in data.items() if k in ("fullName", "email")}
    update["updatedAt"] = datetime.datetime.utcnow()

    result = users_col.update_one(
        {"clerkUserId": clerk_id},
        {"$set": update, "$setOnInsert": {"createdAt": update["updatedAt"]}},
        upsert=True,
    )
    user = users_col.find_one({"clerkUserId": clerk_id}, {"_id": 0})
    status = 201 if result.upserted_id else 200
    return jsonify({"message": "User saved.", "user": user}), status


# ----------------- /api/chats (RAG Chat with DB Storage) -----------------
@app.post("/api/chat")
def rag_chat():
    data = request.get_json(silent=True) or {}

    question    = data.get("question", "").strip()
    senderId    = data.get("senderId", "anonymous")    # ✅ correct Python syntax
    senderName  = data.get("senderName", "Anonymous")
    senderEmail = data.get("senderEmail", "unknown@example.com")

    if senderId == "anonymous":
        print("⚠️  WARNING: senderId is anonymous — frontend is not sending Clerk user ID")

    if not question:
        return jsonify({"error": "Missing question."}), 400

    timestamp = datetime.datetime.utcnow()

    # Greeting / small-talk bypass
    small_talk = {"hi", "hello", "hey", "yo", "hola"}
    if question.lower() in small_talk:
        bot_response = "Hey! Ask me anything about football — rules, VAR, players, tactics. Siiiiuuuu!"

        chats_col.insert_one({
            "senderId": senderId,
            "senderName": senderName,
            "senderEmail": senderEmail,
            "messages": [
                {"senderType": "user", "text": question, "timestamp": timestamp},
                {"senderType": "bot", "text": bot_response, "timestamp": timestamp}
            ]
        })

        return jsonify({"answer": bot_response, "context": []}), 200

    # ── Wrap full RAG pipeline in a root span ─────────────────────────────
    with tracer.start_as_current_span("rag_chat_request") as span:
        span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, "CHAIN")
        span.set_attribute(SpanAttributes.SESSION_ID,  senderId)
        span.set_attribute(SpanAttributes.INPUT_VALUE, question)
        span.set_attribute("user.id",                  senderId)
        span.set_attribute("user.name",                senderName)
        span.set_attribute("user.email",               senderEmail)

        with using_session(senderId):

            # 1️⃣ Retrieve docs
            with tracer.start_as_current_span("vectorstore.similarity_search") as ret_span:
                docs = vectorstore.similarity_search(question, k=5)
                ret_span.set_attribute("retrieval.doc_count", len(docs))

            context = "\n---\n".join(d.page_content for d in docs)

            # 2️⃣ Prompt
            prompt = f"""
You are Cristiano Ronaldo, the legendary Portuguese forward and global football icon.
Speak confidently and clearly. Use the context to answer the question fully.

Context:
{context}

Question:
{question}

Answer:
"""

            # 3️⃣ Generate response
            with tracer.start_as_current_span("ollama.chat") as llm_span:
                llm_span.set_attribute("llm.model",       "llama3")
                llm_span.set_attribute("llm.temperature", 0.7)
                llm_span.set_attribute(SpanAttributes.INPUT_VALUE, prompt[:2000])

                response = ollama.chat(
                    model="llama3",
                    messages=[{"role": "user", "content": prompt}],
                    options={"temperature": 0.7, "num_predict": 500}
                )

                bot_response = response["message"]["content"].strip()
                llm_span.set_attribute(SpanAttributes.OUTPUT_VALUE, bot_response)

        span.set_attribute(SpanAttributes.OUTPUT_VALUE, bot_response)

    # 4️⃣ Save chat
    chats_col.insert_one({
        "senderId": senderId,
        "senderName": senderName,
        "senderEmail": senderEmail,
        "messages": [
            {"senderType": "user", "text": question, "timestamp": timestamp},
            {"senderType": "bot", "text": bot_response, "timestamp": timestamp}
        ]
    })

    return jsonify({
        "answer": bot_response,
        "context": [{"text": d.page_content, "metadata": d.metadata} for d in docs]
    }), 200


API_FOOTBALL_KEY = "66a1e3578455229ae3d093a62d801070"

@app.route("/live-matches-today")
def live_matches_today():
    headers = {
        "x-apisports-key": API_FOOTBALL_KEY
    }

    today = date.today().strftime("%Y-%m-%d")

    live_url = "https://v3.football.api-sports.io/fixtures?live=all"
    today_url = f"https://v3.football.api-sports.io/fixtures?date={today}&timezone=Asia/Kolkata"
    upcoming_url = "https://v3.football.api-sports.io/fixtures?next=10&timezone=Asia/Kolkata"

    def format_matches(data, upcoming=False):
        matches = []
        for match in data:
            matches.append({
                "league": match["league"]["name"],
                "home_team": match["teams"]["home"]["name"],
                "away_team": match["teams"]["away"]["name"],
                "home_score": match["goals"]["home"] if not upcoming else 0,
                "away_score": match["goals"]["away"] if not upcoming else 0,
                "status": (
                    match["fixture"]["status"]["short"]
                    if not upcoming
                    else match["fixture"]["date"][:10]
                ),
                "minute": match["fixture"]["status"]["elapsed"]
                if not upcoming
                else None,
            })
        return matches

    try:
        live_res = requests.get(live_url, headers=headers, timeout=10)
        live_res.raise_for_status()
        live_data = live_res.json().get("response", [])

        if live_data:
            return jsonify({
                "title": "🔴 Live Football Matches",
                "type": "live",
                "matches": format_matches(live_data)
            }), 200

        today_res = requests.get(today_url, headers=headers, timeout=10)
        today_res.raise_for_status()
        today_data = today_res.json().get("response", [])

        if today_data:
            return jsonify({
                "title": "⚽ Today's Football Matches",
                "type": "today",
                "matches": format_matches(today_data)
            }), 200

        upcoming_data = []

        for i in range(1, 8):
            check_date = (date.today() + timedelta(days=i)).strftime("%Y-%m-%d")
            upcoming_url = (
                f"https://v3.football.api-sports.io/fixtures"
                f"?date={check_date}&timezone=Asia/Kolkata"
            )

            res = requests.get(upcoming_url, headers=headers, timeout=10)
            res.raise_for_status()
            data = res.json().get("response", [])

            if data:
                upcoming_data = data
                break

        return jsonify({
            "title": "📅 Upcoming Football Matches",
            "type": "upcoming",
            "matches": format_matches(upcoming_data, upcoming=True)
        }), 200

    except Exception as e:
        print("API ERROR:", e)
        return jsonify({
            "error": "Failed to fetch football matches",
            "matches": []
        }), 500


@app.get("/api/messages")
def get_messages():
    """Return last 50 messages"""
    messages = list(
        user_chats_col.find()
        .sort("timestamp", 1)
        .limit(50)
    )

    for m in messages:
        m["_id"] = str(m["_id"])

    return jsonify(messages), 200


@app.post("/api/messages")
def post_message():
    """Save a user message"""
    data = request.get_json()

    if not data or "senderId" not in data or "text" not in data:
        return jsonify({"error": "Invalid request"}), 400

    message = {
        "senderId": data["senderId"],
        "senderName": data.get("senderName", "Unknown"),
        "senderEmail": data.get("senderEmail", "unknown@example.com"),
        "text": data["text"],
        "timestamp": datetime.datetime.utcnow(),
    }

    user_chats_col.insert_one(message)

    return jsonify({"message": "Message sent"}), 201


# ----------------- Run Server -----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)