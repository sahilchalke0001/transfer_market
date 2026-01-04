import React, { useState, useEffect } from "react";
// 🆕 Import useUser from Clerk
import { useUser } from "@clerk/clerk-react";
import "./LaLigaPage.css";

// Placeholder array for team names (In a real app, this would come from the backend)
const TEAM_NAMES = [
  "Ath Bilbao",
  "Mallorca",
  "Valencia",
  "Ath Madrid",
  "Barcelona",
  "La Coruna",
  "Malaga",
  "Numancia",
  "Oviedo",
  "Sevilla",
  "Sociedad",
  "Alaves",
  "Betis",
  "Celta",
  "Espanol",
  "Real Madrid",
  "Santander",
  "Valladolid",
  "Vallecano",
  "Zaragoza",
  "Las Palmas",
  "Osasuna",
  "Villarreal",
  "Tenerife",
  "Recreativo",
  "Albacete",
  "Murcia",
  "Getafe",
  "Levante",
  "Cadiz",
  "Gimnastic",
  "Almeria",
  "Sp Gijon",
  "Xerez",
  "Hercules",
  "Granada",
  "Elche",
  "Eibar",
  "Cordoba",
  "Leganes",
  "Girona",
  "Huesca",
];

function LaLigaPage() {
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [predictionResult, setPredictionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🆕 Get authentication state
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
      // ✅ Make API call to Flask backend
      const response = await fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          home_team: homeTeam,
          away_team: awayTeam,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch prediction");
      }

      const data = await response.json();

      // ✅ Update state with backend results
      setPredictionResult({
        homeGoals: data.home_goals,
        awayGoals: data.away_goals,
        outcome: data.result,
      });
    } catch (err) {
      setError("Prediction failed. Ensure your Flask server is running.");
      console.error("Prediction error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render the team names with black color
  const highlightedTeamNames = TEAM_NAMES.map((name, index) => (
    <span key={index} style={{ color: "black", marginRight: "5px" }}>
      {name}
      {index < TEAM_NAMES.length - 1 ? ", " : ""}
    </span>
  ));

  // 1. Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="laliga-page-container text-center py-10">
        <h2 className="text-xl text-gray-500">
          Loading authentication status...
        </h2>
      </div>
    );
  }

  // 2. Show sign-in warning if not signed in (similar to Hero.jsx)
  if (!isSignedIn) {
    return (
      <div className="laliga-page-container">
        <h2 className="laliga-title">LaLiga Match Predictor </h2>
        <p className="chatbot-login-warning">
          🔒 Please{" "}
          <a href="/sign-in" style={{ color: "#2563eb" }}>
            sign in
          </a>{" "}
          to use the La Liga predictor tool.
        </p>
      </div>
    );
  }

  // 3. Show full functionality if signed in
  return (
    <div className="laliga-page-container">
      {/* <img src="/LaLiga/logo.png" alt="LaLiga Logo" className="laliga-logo" /> */}
      <h2 className="laliga-title">LaLiga Match Predictor </h2>

      <div className="team-input-section">
        <input
          type="text"
          placeholder="Enter Home Team (e.g., Barcelona)"
          value={homeTeam}
          onChange={(e) => setHomeTeam(e.target.value)}
          className="team-input"
        />
        <input
          type="text"
          placeholder="Enter Away Team (e.g., Real Madrid)"
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
        <p>Accepted Naming Conventions:</p>
        <div className="team-list">{highlightedTeamNames}</div>
      </div>

      {error && <p className="error-message">🚨 {error}</p>}

      {predictionResult && (
        <div className="prediction-results">
          <h3>Prediction:</h3>
          <p className="score">
            {homeTeam} {predictionResult.homeGoals} -
            {predictionResult.awayGoals} {awayTeam}
          </p>
          <p className="outcome">Result: {predictionResult.outcome}</p>
        </div>
      )}
    </div>
  );
}

export default LaLigaPage;
