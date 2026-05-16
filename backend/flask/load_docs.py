import os
from dotenv import load_dotenv
from langchain_chroma import Chroma
from sentence_transformers import SentenceTransformer
from app import LocalEmbeddingWrapper

load_dotenv()

CHROMA_DIR = os.getenv("CHROMA_DIR", "chroma_db")
CHROMA_COLL = os.getenv("CHROMA_COLLECTION_NAME", "documents")

#  Load embeddings model
embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
embeddings = LocalEmbeddingWrapper(embedder)

#  Initialize vectorstore
vectorstore = Chroma(
    collection_name=CHROMA_COLL,
    embedding_function=embeddings,
    persist_directory=CHROMA_DIR,
)

print(f" Connected to Chroma collection '{CHROMA_COLL}'")

#  Example football documents
#  Extended football knowledge base
docs = [
    # Match structure
    ("A football match lasts 90 minutes, divided into two halves of 45 minutes each, with additional stoppage time added at the end of each half.", {"topic": "match_duration"}),
    ("Half-time in football lasts 15 minutes, during which players rest and teams adjust tactics.", {"topic": "match_duration"}),

    # VAR
    ("VAR stands for Video Assistant Referee. It is used to review key match-changing decisions such as goals, penalties, red cards, and cases of mistaken identity.", {"topic": "VAR"}),
    ("VAR cannot be used for yellow card decisions unless it leads to a red card incident.", {"topic": "VAR"}),
    ("The final decision after a VAR review is always made by the on-field referee.", {"topic": "VAR"}),

    # Offside
    ("A player is in an offside position if any part of the head, body, or feet is nearer to the opponent’s goal line than both the ball and the second-last defender.", {"topic": "offside"}),
    ("Being in an offside position is not an offense unless the player is involved in active play.", {"topic": "offside"}),
    ("Offside decisions consider the moment the ball is played by a teammate.", {"topic": "offside"}),

    # Fouls & Cards
    ("A yellow card is shown for unsporting behavior, dissent, delaying the restart of play, or repeated fouls.", {"topic": "cards"}),
    ("A red card results in a player being sent off and the team playing with one fewer player.", {"topic": "cards"}),
    ("Two yellow cards in the same match result in a red card.", {"topic": "cards"}),

    # Free kicks & penalties
    ("A direct free kick allows a goal to be scored directly without another player touching the ball.", {"topic": "free_kicks"}),
    ("A penalty kick is awarded for a direct free kick offense committed inside the penalty area.", {"topic": "penalties"}),

    # Goalkeeper rules
    ("A goalkeeper may use their hands only inside their own penalty area.", {"topic": "goalkeeper"}),
    ("Goalkeepers cannot pick up a deliberate back-pass from a teammate.", {"topic": "goalkeeper"}),

    # Match officials
    ("A football match is controlled by a referee, assisted by two assistant referees and a fourth official.", {"topic": "officials"}),
    ("Assistant referees help with offside decisions and monitoring the touchline.", {"topic": "officials"}),

    # Substitutions
    ("Most professional competitions allow up to five substitutions per team.", {"topic": "substitutions"}),
    ("A substituted player cannot return to the match.", {"topic": "substitutions"}),
]


vectorstore.add_texts(
    texts=[d[0] for d in docs],
    metadatas=[d[1] for d in docs]
)

print(" Documents successfully added to Chroma!")
