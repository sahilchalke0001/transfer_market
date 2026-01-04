import React, { useState } from "react";
import { useUser } from "@clerk/clerk-react"; // 🔒 Clerk authentication
import "./BundesligaPredictor.css";

const TEAM_NAMES = [
  "Duisburg",
  "Wolfsburg",
  "Bayern Munich",
  "Ein Frankfurt",
  "Kaiserslautern",
  "Schalke 04",
  "Stuttgart",
  "Hertha",
  "Ulm",
  "Bielefeld",
  "Unterhaching",
  "Dortmund",
  "Freiburg",
  "Hamburg",
  "Munich 1860",
  "Werder Bremen",
  "Hansa Rostock",
  "Leverkusen",
  "Cottbus",
  "Bochum",
  "FC Koln",
  "Mgladbach",
  "St Pauli",
  "Nurnberg",
  "Hannover",
  "Mainz",
  "Aachen",
  "Karlsruhe",
  "Hoffenheim",
  "Augsburg",
  "Greuther Furth",
  "Fortuna Dusseldorf",
  "Braunschweig",
  "Paderborn",
  "Darmstadt",
  "Ingolstadt",
  "RB Leipzig",
  "Union Berlin",
  "Heidenheim",
];

function BundesligaPredictor() {
  const { isSignedIn, isLoaded } = useUser(); // 🔒 Secure Access
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Simulated API call (later you can replace this with your backend endpoint)
  const handlePredict = async () => {
    if (!homeTeam || !awayTeam) {
      setError("Please enter both team names.");
      setPrediction(null);
      return;
    }

    if (homeTeam === awayTeam) {
      setError("Home Team and Away Team cannot be the same.");
      setPrediction(null);
      return;
    }

    setLoading(true);
    setError("");
    setPrediction(null);

    try {
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

      if (!response.ok) throw new Error("Prediction failed");

      const data = await response.json();
      setPrediction({
        homeGoals: data.home_goals,
        awayGoals: data.away_goals,
        result: data.result,
      });
    } catch (err) {
      setError("Prediction failed. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // 🕒 1. Wait for Clerk to load
  if (!isLoaded) {
    return (
      <div className="bundesliga-container">
        <h2 className="loading-text">Loading authentication status...</h2>
      </div>
    );
  }

  // 🔐 2. Require sign-in
  if (!isSignedIn) {
    return (
      <div className="bundesliga-container">
        <h2 className="bundesliga-title">Bundesliga Match Predictor </h2>
        <p className="auth-warning">
          🔒 Please{" "}
          <a href="/sign-in" className="sign-in-link">
            sign in
          </a>{" "}
          to use the Bundesliga Predictor tool.
        </p>
      </div>
    );
  }

  // ✅ 3. Show predictor when signed in
  return (
    <div className="bundesliga-container">
      <h2 className="bundesliga-title">Bundesliga Match Predictor </h2>

      <div className="team-input-section">
        <input
          type="text"
          placeholder="Enter Home Team (e.g., Bayern Munich)"
          value={homeTeam}
          onChange={(e) => setHomeTeam(e.target.value)}
          className="team-input"
        />
        <input
          type="text"
          placeholder="Enter Away Team (e.g., Dortmund)"
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
        <p> Accepted Naming Conventions:</p>
        <div className="team-list">
          {TEAM_NAMES.map((team, index) => (
            <span key={index} className="team-name">
              {team}
              {index < TEAM_NAMES.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>
      </div>

      {error && <p className="error-message">🚨 {error}</p>}

      {prediction && (
        <div className="prediction-results">
          <h3>Prediction Result</h3>
          <p className="score">
            {homeTeam} <strong>{prediction.homeGoals}</strong> -{" "}
            <strong>{prediction.awayGoals}</strong> {awayTeam}
          </p>
          <p className="outcome">
            Result: <strong>{prediction.result}</strong>
          </p>
        </div>
      )}
    </div>
  );
}

export default BundesligaPredictor;
