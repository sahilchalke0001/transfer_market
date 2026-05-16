import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import "./FootballNews.css";
import NewsImage from "../assets/News.png";

const API_KEY = "8a1a97d2a3a4431fac26c9ba27ca277c";
const NEWS_API_URL = "https://newsapi.org/v2/everything";

const QUICK_FILTERS = [
  "Real Madrid",
  "Premier League",
  "Ronaldo",
  "Champions League",
  "Transfer News",
  "La Liga",
];

/* ── Skeleton placeholder cards ── */
const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-img" />
    <div className="skeleton-body">
      <div className="skeleton-line full" />
      <div className="skeleton-line medium" />
      <div className="skeleton-line short" style={{ marginBottom: "1.5rem" }} />
      <div className="skeleton-line full" />
      <div className="skeleton-line medium" />
    </div>
  </div>
);

/* ── Format published date ── */
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return "";
  }
};

const FootballNews = () => {
  const { isSignedIn, isLoaded } = useUser();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("Real Madrid");
  const [activeChip, setActiveChip] = useState("Real Madrid");

  const fetchNews = async (searchQuery = query) => {
    setLoading(true);
    setError("");
    setArticles([]);
    try {
      const response = await fetch(
        `${NEWS_API_URL}?q=${encodeURIComponent(
          searchQuery
        )}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${API_KEY}`
      );
      const data = await response.json();
      if (response.ok && data.articles && data.articles.length > 0) {
        setArticles(data.articles);
      } else {
        setError("No articles found for this search.");
      }
    } catch (err) {
      setError("Failed to fetch news: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews("Real Madrid");
  }, []);

  const handleChipClick = (chip) => {
    setActiveChip(chip);
    setQuery(chip);
    fetchNews(chip);
  };

  const handleSearch = () => {
    setActiveChip("");
    fetchNews(query);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  /* 1️⃣ Clerk still loading */
  if (!isLoaded) {
    return (
      <div className="football-news-container">
        <div className="news-status">
          <span className="status-icon">⏳</span>
          <p className="status-title">Loading…</p>
        </div>
      </div>
    );
  }

  /* 2️⃣ Not signed in — glassmorphism gate */
  if (!isSignedIn) {
    return (
      <div className="football-news-locked">
        <div
          className="locked-backdrop"
          style={{ backgroundImage: `url(${NewsImage})` }}
        />
        <div className="locked-card">
          <span className="locked-icon">🔒</span>
          <h2>Football News</h2>
          <p>
            Sign in to access real-time football news, transfer updates, and
            match reports from around the world.
          </p>
          <a href="/sign-in" className="locked-signin-btn">
            Sign In to Continue →
          </a>
        </div>
      </div>
    );
  }

  /* 3️⃣ Authenticated — main news view */
  return (
    <div className="football-news-container">
      {/* ── Header ── */}
      <div className="news-page-header">
        <h1 className="news-heading"> Football News</h1>
        <p className="news-subheading">
          Live updates · Transfers · Match reports
        </p>
        <div className="news-divider" />
      </div>

      {/* ── Search bar ── */}
      <div className="search-bar">
        <div className="search-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Search football news (e.g., Ronaldo, Real Madrid)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          className="search-button"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {/* ── Quick-filter chips ── */}
      <div className="filter-chips">
        {QUICK_FILTERS.map((chip) => (
          <button
            key={chip}
            className={`chip ${chip === activeChip ? "active" : ""}`}
            onClick={() => handleChipClick(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* ── Results meta ── */}
      {!loading && !error && articles.length > 0 && (
        <p className="results-meta">
          Showing <strong>{articles.length}</strong> articles for &quot;<strong>{activeChip || query}</strong>&quot;
        </p>
      )}

      {/* ── Skeleton loading ── */}
      {loading && (
        <div className="skeleton-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* ── Error state ── */}
      {!loading && error && (
        <div className="news-status error">
          <span className="status-icon">⚠️</span>
          <p className="status-title">Something went wrong</p>
          <p className="status-subtitle">{error}</p>
        </div>
      )}

      {/* ── News grid ── */}
      {!loading && !error && articles.length > 0 && (
        <div className="news-grid">
          {articles.map((article, index) => (
            <div key={index} className="news-card">
              {/* Image */}
              <div className="news-image-wrapper">
                <img
                  src={
                    article.urlToImage && article.urlToImage.trim() !== ""
                      ? article.urlToImage
                      : "https://placehold.co/700x400/070d2e/94a3b8?text=No+Image"
                  }
                  alt={article.title || "News"}
                  className="news-image"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      "https://placehold.co/700x400/070d2e/94a3b8?text=No+Image";
                  }}
                />
                {/* Badges */}
                <span className="source-badge">
                  {article.source?.name || "Unknown"}
                </span>
                <span className="card-number">{index + 1}</span>
              </div>

              {/* Body */}
              <div className="news-content">
                <h2 className="news-title">{article.title}</h2>
                {article.description && (
                  <p className="news-description">{article.description}</p>
                )}

                {/* Footer */}
                <div className="news-card-footer">
                  <span className="news-date">
                    {formatDate(article.publishedAt)}
                  </span>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="read-more"
                  >
                    Read More
                    <span className="read-more-arrow">→</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && articles.length === 0 && (
        <div className="news-status">
          <span className="status-icon">📭</span>
          <p className="status-title">No articles found</p>
          <p className="status-subtitle">Try a different search term.</p>
        </div>
      )}
    </div>
  );
};

export default FootballNews;
