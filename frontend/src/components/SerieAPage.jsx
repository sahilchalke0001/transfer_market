import React, { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import "./SerieAPage.css";

const TEAM_NAMES = [
  "Bologna",
  "Fiorentina",
  "Inter",
  "Juventus",
  "Lecce",
  "Perugia",
  "Piacenza",
  "Venezia",
  "Lazio",
  "Bari",
  "Reggina",
  "Udinese",
  "Cagliari",
  "Milan",
  "Parma",
  "Roma",
  "Torino",
  "Verona",
  "Napoli",
  "Atalanta",
  "Brescia",
  "Vicenza",
  "Chievo",
  "Como",
  "Modena",
  "Empoli",
  "Ancona",
  "Sampdoria",
  "Siena",
  "Palermo",
  "Livorno",
  "Messina",
  "Ascoli",
  "Treviso",
  "Catania",
  "Genoa",
  "Cesena",
  "Novara",
  "Pescara",
  "Sassuolo",
  "Frosinone",
  "Carpi",
  "Crotone",
  "Benevento",
  "Spal",
  "Spezia",
  "Salernitana",
  "Monza",
  "Cremonese",
];

function SerieAPage() {
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [predictionResult, setPredictionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Clerk authentication
  const { isSignedIn, isLoaded } = useUser();

  const handlePredict = async () => {
    if (!homeTeam || !awayTeam) {
      setError("Please enter both team names.");
      setPredictionResult(null);
      return;
    }

    if (homeTeam === awayTeam) {
      setError("Home Team and Away Team cannot be the same.");
      setPredictionResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setPredictionResult(null);

    try {
      const response = await fetch("http://127.0.0.1:5000/seriea_predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ home_team: homeTeam, away_team: awayTeam }),
      });

      if (!response.ok) {
        throw new Error("Server error");
      }

      const data = await response.json();
      setPredictionResult({
        homeGoals: data.home_goals,
        awayGoals: data.away_goals,
        outcome: data.result,
      });
    } catch (err) {
      console.error("Prediction error:", err);
      setError("Prediction failed. Ensure your Flask server is running.");
    } finally {
      setLoading(false);
    }
  };

  // Show loading until Clerk state is ready
  if (!isLoaded) {
    return (
      <div className="seriea-page-container text-center py-10">
        <h2 className="text-xl text-gray-500">
          Loading authentication status...
        </h2>
      </div>
    );
  }

  // Restrict access if user not signed in
  if (!isSignedIn) {
    return (
      <div className="seriea-page-container">
        <h2 className="seriea-title">Serie A Match Predictor </h2>
        <p className="chatbot-login-warning">
          🔒 Please{" "}
          <a href="/sign-in" style={{ color: "#2563eb" }}>
            sign in
          </a>{" "}
          to use the Serie A predictor tool.
        </p>
      </div>
    );
  }

  // Show predictor when signed in
  return (
    <div className="seriea-page-container">
      <h2 className="seriea-title">Serie A Match Predictor </h2>

      <div className="team-input-section">
        <input
          type="text"
          placeholder="Enter Home Team (e.g., Juventus)"
          value={homeTeam}
          onChange={(e) => setHomeTeam(e.target.value)}
          className="team-input"
        />
        <input
          type="text"
          placeholder="Enter Away Team (e.g., Inter)"
          value={awayTeam}
          onChange={(e) => setAwayTeam(e.target.value)}
          className="team-input"
        />
        <button
          onClick={handlePredict}
          disabled={loading}
          className="predict-button"
        >
          {loading ? "Predicting..." : "Predict Match Outcome"}
        </button>
      </div>

      <div className="naming-convention">
        <p>Accepted Team Names:</p>
        <div className="team-list">
          {TEAM_NAMES.map((name, i) => (
            <span key={i} style={{ color: "black", marginRight: "5px" }}>
              {name}
              {i < TEAM_NAMES.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>
      </div>

      {error && <p className="error-message">🚨 {error}</p>}

      {predictionResult && (
        <div className="prediction-results">
          <h3>Prediction:</h3>
          <p className="score">
            {homeTeam} <strong>{predictionResult.homeGoals}</strong> –{" "}
            <strong>{predictionResult.awayGoals}</strong> {awayTeam}
          </p>
          <p className="outcome">Result: {predictionResult.outcome}</p>
        </div>
      )}
    </div>
  );
}

export default SerieAPage;
