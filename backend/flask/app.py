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


# ─────────────── ENV / DB ───────────────
load_dotenv()

MONGO_URI   = os.getenv("MONGODB_URI")
DB_NAME     = os.getenv("MONGO_DB_NAME", "test")

# ✅ Use same Chroma settings as your data loader
CHROMA_DIR  = os.getenv("CHROMA_DIR", r"C:\Users\Sahil\Desktop\s\backend\flask\chroma_db")
CHROMA_COLL = os.getenv("CHROMA_COLLECTION_NAME", "documents")  # must match the one used when loading data
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
# ✅ Local Embedding Model (no API key required)
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


# ✅ Local Chat Model (lightweight & CPU-friendly)
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

# ✅ Test Chroma connection
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
    question = data.get("question", "").strip()
   

    if not question:
        return jsonify({"error": "Missing question."}), 400

    timestamp = datetime.datetime.utcnow()

    #  Greeting / small-talk bypass
    small_talk = {"hi", "hello", "hey", "yo", "hola"}
    if question.lower() in small_talk:
        bot_response = "Hey! Ask me anything about football — rules, VAR, players, tactics. Siiiiuuuu!"

        # Store both user and bot together in one document
        chats_col.insert_one({
            
            "messages": [
                {
                    "senderType": "user",
                    "text": question,
                    "timestamp": timestamp
                },
                {
                    "senderType": "bot",
                    "text": bot_response,
                    "timestamp": timestamp
                }
            ]
        })

        return jsonify({"answer": bot_response, "context": []}), 200

    # 1️⃣ Retrieve docs
    docs = vectorstore.similarity_search(question, k=5)
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

    # 3️⃣ Generate bot response
    bot_response = chatbot(
        prompt,
        max_new_tokens=500,
        do_sample=False,
        temperature=5,
    )[0]["generated_text"].strip()

    # Store both user and bot together in one document
    chats_col.insert_one({
        "senderId": senderId,
        "senderName": senderName,
        "senderEmail": senderEmail,
        "messages": [
            {
                "senderType": "user",
                "text": question,
                "timestamp": timestamp
            },
            {
                "senderType": "bot",
                "text": bot_response,
                "timestamp": timestamp
            }
        ]
    })

    return jsonify({
        "answer": bot_response,
        "context": [{"text": d.page_content, "metadata": d.metadata} for d in docs]
    })


# ----------------- User-to-User Chat Endpoints -----------------
@app.get("/api/messages")
def get_messages():
    """Return last 50 messages"""
    messages = list(user_chats_col.find().sort("timestamp", 1).limit(50))
    for m in messages:
        m["_id"] = str(m["_id"])  # convert ObjectId to string
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

API_FOOTBALL_KEY = "66a1e3578455229ae3d093a62d801070"

@app.route("/live-matches-today")
def live_matches_today():
    headers = {
        "x-apisports-key": API_FOOTBALL_KEY
    }

    today = date.today().strftime("%Y-%m-%d")

    live_url = "https://v3.football.api-sports.io/fixtures?live=all"
    today_url = f"https://v3.football.api-sports.io/fixtures?date={today}"

    try:
        # 1️⃣ Try LIVE matches
        live_res = requests.get(live_url, headers=headers, timeout=10)
        live_res.raise_for_status()
        live_data = live_res.json().get("response", [])

        if live_data:
            return jsonify(live_data)

        # 2️⃣ Otherwise, TODAY matches
        today_res = requests.get(today_url, headers=headers, timeout=10)
        today_res.raise_for_status()
        today_data = today_res.json().get("response", [])

        return jsonify(today_data)

    except Exception as e:
        print("API ERROR:", e)
        return jsonify([]), 500

# ----------------- Run Server -----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
