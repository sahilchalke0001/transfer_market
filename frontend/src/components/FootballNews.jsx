import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react"; // 🧩 Clerk Authentication
import "./FootballNews.css";
import NewsImage from "../assets/News.png";

const API_KEY = "8a1a97d2a3a4431fac26c9ba27ca277c";
const NEWS_API_URL = "https://newsapi.org/v2/everything";

const FootballNews = () => {
  const { isSignedIn, isLoaded } = useUser(); // 🔒 Auth state from Clerk
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("Real Madrid");

  // Fetch news dynamically based on query
  const fetchNews = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${NEWS_API_URL}?q=${encodeURIComponent(
          query
        )}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${API_KEY}`
      );

      const data = await response.json();

      if (response.ok && data.articles && data.articles.length > 0) {
        setArticles(data.articles);
      } else {
        setError("No football news articles found.");
        setArticles([]);
      }
    } catch (err) {
      setError("Error fetching news: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []); // Default load

  // 1️⃣ Loading Clerk auth state
  if (!isLoaded) {
    return (
      <div className="football-news-container">
        <h2 className="loading">Loading authentication status...</h2>
      </div>
    );
  }

  // 2️⃣ If not signed in — block access
  if (!isSignedIn) {
    return (
      <div
        className="football-news-container full-height"
        style={{
          backgroundImage: `url(${NewsImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          color: "white",
          textShadow: "2px 2px 8px rgba(0,0,0,0.7)",
        }}
      >
        <h2 className="news-heading">⚽ Football News</h2>
        <p className="chatbot-login-warning">
          🔒 Please{" "}
          <a href="/sign-in" style={{ color: "#ffffff", fontWeight: "bold" }}>
            sign in
          </a>{" "}
          to view the latest football news.
        </p>
      </div>
    );
  }

  // 3️⃣ Authenticated users — show news section
  return (
    <div className="football-news-container">
      <h1 className="news-heading">⚽ Top Football News ⚽</h1>

      {/* Search bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search football news (e.g., Messi, Premier League)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        <button
          onClick={fetchNews}
          disabled={loading}
          className="search-button"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* News Section */}
      {loading && <p className="loading">Loading news...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && articles.length > 0 && (
        <div className="news-grid">
          {articles.map((article, index) => (
            <div key={index} className="news-card">
              <img
                src={
                  article.urlToImage && article.urlToImage.trim() !== ""
                    ? article.urlToImage
                    : "https://via.placeholder.com/700x400.png?text=No+Image+Available"
                }
                alt={article.title || "No Title"}
                className="news-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src =
                    "https://via.placeholder.com/700x400.png?text=No+Image+Available";
                }}
              />

              <div className="news-content">
                <h2 className="news-title">
                  {index + 1}. {article.title}
                </h2>
                <p className="news-source">
                  <strong>Source:</strong> {article.source?.name || "Unknown"}
                </p>

                {/* 🆕 Add short article description here */}
                {article.description && (
                  <p className="news-description">
                    {article.description.length > 150
                      ? article.description.slice(0, 150) + "..."
                      : article.description}
                  </p>
                )}

                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="read-more"
                >
                  Read More →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FootballNews;
