
# Football Intelligence Platform

A full-stack football analytics and AI platform built with React, Flask, and LangChain.

---
<img width="1238" height="886" alt="image" src="https://github.com/user-attachments/assets/8cb57be3-0760-41bb-9dfb-1b75456318f3" />
## Features

### 1. La Liga Analytics
- Match statistics, standings, and performance metrics for La Liga

### 2. Premier League Analytics
- Match statistics, standings, and performance metrics for the Premier League

### 3. Serie A Analytics
- Match statistics, standings, and performance metrics for Serie A

### 4. Bundesliga Analytics
- Match statistics, standings, and performance metrics for Bundesliga

### 5. Player Valuation Predictor
- Predicts player market value using ensemble machine learning models
- Models used:
  - `RandomForestRegressor`
  - `BaggingRegressor`
  - `GradientBoostingRegressor`
  - `AdaBoostRegressor`

### 6. Football News
- Live football news fetched via **NewsAPI**
- Latest transfers, match results, and breaking football stories

### 7. Authentication
- Secure Sign In / Sign Out powered by **Clerk Auth Provider**
- User sessions persisted across the platform

### 8. Live Football Community Chat
- Real-time chat between users
- Backend powered by **MongoDB** — stores user email and chat messages

### 9. AI Football Chatbot (RAG)
- Ask anything about football — rules, players, tactics, history
- Powered by a full Retrieval-Augmented Generation (RAG) pipeline

| Component | Technology |
|---|---|
| Framework | LangChain |
| LLM | LLaMA 3 (via Ollama) |
| Vector Store | ChromaDB |
| Embedding Model | sentence-transformers/all-MiniLM-L6-v2 |
| Persona | Cristiano Ronaldo |

### 10. Player Detection
- Detects football players in images and video
- Model trained with **YOLO**
- Dataset managed and stored via **Roboflow**

### 11. Live Football Match Scores
- Real-time live scores, today's matches, and upcoming fixtures
- Powered by **API-Football** (api-sports.io)
- Covers live matches, today's schedule, and next 7 days

### 12. Chatbot Observability
- Full observability of the RAG chatbot pipeline using **Arize Phoenix**
- Tracks every request end-to-end with OpenTelemetry tracing

| Capability | Details |
|---|---|
| Tracing | Every request tracked — retrieval and LLM spans |
| Sessions | Grouped by Clerk user ID |
| Evaluations | Relevance, Hallucination and Quality scoring via LLaMA3 |
| Latency Monitoring | p50 / p99 latency per session |
| Metrics Dashboard | Requests per hour, per user, recent requests table |
| CSV Export | Evaluation scores saved to eval_results.csv |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Clerk |
| Backend | Python, Flask |
| Database | MongoDB |
| Vector Store | ChromaDB |
| LLM | LLaMA 3 (Ollama) |
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 |
| ML Models | scikit-learn (RandomForest, Bagging, GradientBoosting, AdaBoost) |
| Player Detection | YOLO, Roboflow |
| Auth | Clerk |
| News | NewsAPI |
| Scores API | API-Football |
| Observability | Arize Phoenix, OpenTelemetry |

---

## Observability

The RAG chatbot is fully instrumented with **Arize Phoenix** for production-grade observability.


### Capabilities

- **Spans and Traces** — full request lifecycle visible in the Phoenix UI
- **Sessions** — all messages from the same user grouped by Clerk user ID
- **Evaluations** — every response automatically scored for Relevance, Hallucination, and Quality
- **Metrics Dashboard** — visual charts for latency trends, requests per hour, and requests per user
- **CSV Export** — evaluation scores saved locally for offline analysis

---

## Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `MONGO_DB_NAME` | Database name |
| `CHROMA_DIR` | Path to ChromaDB storage |
| `CHROMA_COLLECTION_NAME` | ChromaDB collection name |
| `PORT` | Flask server port (default 5000) |
| `VITE_API_BASE` | Frontend API base URL |

---

## Author

Built by Sahil Chalke
