import React, { useState, useEffect } from "react";
// 🆕 Using the actual useUser hook for authentication
import { useUser } from "@clerk/clerk-react";
// 🆕 Importing the separated stylesheet
import "./PremierLeaguePage.css";

// --- Custom SVG Icons ---
const LoaderIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="spinner"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const AlertTriangleIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// Team Names from the Python code
const TEAM_NAMES = [
  "Arsenal",
  "Chelsea",
  "Coventry",
  "Leeds",
  "Middlesbrough",
  "Newcastle",
  "Sheffield Weds",
  "Watford",
  "West Ham",
  "Everton",
  "Tottenham",
  "Derby",
  "Sunderland",
  "Wimbledon",
  "Aston Villa",
  "Leicester",
  "Man United",
  "Southampton",
  "Bradford",
  "Liverpool",
  "Charlton",
  "Ipswich",
  "Man City",
  "Bolton",
  "Blackburn",
  "Fulham",
  "Birmingham",
  "Middlesboro",
  "West Brom",
  "Portsmouth",
  "Wolves",
  "Norwich",
  "Crystal Palace",
  "Wigan",
  "Reading",
  "Sheffield United",
  "Hull",
  "Stoke",
  "Burnley",
  "Blackpool",
  "QPR",
  "Swansea",
  "Cardiff",
  "Bournemouth",
  "Brighton",
  "Huddersfield",
  "Brentford",
  "Nott'm Forest",
  "Luton",
];

const Note_message =
  "The model has been trained on 25 years of historical results (1999-2024). It makes predictions based on past encounters between the teams and their current form. Please note that these predictions are not guaranteed to be accurate and should be used as a guide rather than a definitive forecast. Factors not accounted for by the model can influence match outcomes.";

// --- Main Component ---
function PremierLeaguePage() {
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [predictionResult, setPredictionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);

  // 🆕 Using the real Clerk hook instead of the simulation
  const { isSignedIn, isLoaded } = useUser();

  const handlePredict = async () => {
    // Input validation (same as before)
    if (!homeTeam.trim() || !awayTeam.trim()) {
      setError("Please enter both team names.");
      setPredictionResult(null);
      return;
    }
    if (homeTeam.trim() === awayTeam.trim()) {
      setError("Home Team and Away Team cannot be the same.");
      setPredictionResult(null);
      return;
    }
    if (
      !TEAM_NAMES.includes(homeTeam.trim()) ||
      !TEAM_NAMES.includes(awayTeam.trim())
    ) {
      setError(
        "One or both team names are not in the accepted naming convention list. Please check the list below."
      );
      setPredictionResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setPredictionResult(null);

    try {
      const resp = await fetch("http://127.0.0.1:5000/pl_predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          home_team: homeTeam.trim(),
          away_team: awayTeam.trim(),
        }),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(
          errJson.error || `Server responded with ${resp.status}`
        );
      }

      const data = await resp.json();
      setPredictionResult({
        homeGoals: data.home_goals,
        awayGoals: data.away_goals,
        outcome: data.result,
        raw_home: data.raw_home,
        raw_away: data.raw_away,
      });
    } catch (err) {
      console.error("Prediction fetch error:", err);
      setError(
        "Prediction failed. Ensure the backend is running and accessible."
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper to render the team names
  const highlightedTeamNames = TEAM_NAMES.map((name, index) => (
    <span key={index} className="team-tag">
      {name}
    </span>
  ));

  // --- Conditional Renders based on Auth State ---

  if (!isLoaded) {
    return (
      <div className="container loading-state">
        <h2 className="loading-text">
          <LoaderIcon
            style={{ width: "20px", height: "20px", marginRight: "8px" }}
          />
          Loading application state...
        </h2>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container auth-warning-container">
        <h2 className="header-title-auth">Premier League Match Predictor </h2>
        <p className="auth-warning-message">
          🔒 Please {/* 🆕 Using a standard link for auth */}
          <a href="/sign-in" className="auth-link">
            sign in
          </a>{" "}
          to use the Premier League predictor tool.
        </p>
      </div>
    );
  }

  // --- Main Predictor UI (if signed in) ---
  return (
    <>
      {/* 💅 Style block removed and placed in PremierLeaguePage.css */}

      <div className="container">
        <div className="header-flex">
          <h2 className="header-title">Premier League Match Predictor </h2>
        </div>
        {/* Input Section */}
        <div className="input-group">
          <input
            type="text"
            placeholder="Enter Home Team (e.g., Man United)"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            className="input-field"
          />
          <input
            type="text"
            placeholder="Enter Away Team (e.g., Liverpool)"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            className="input-field"
          />
          <button
            onClick={handlePredict}
            disabled={loading || !homeTeam.trim() || !awayTeam.trim()}
            className="predict-button"
          >
            {loading ? (
              <>
                <LoaderIcon
                  style={{ width: "20px", height: "20px", marginRight: "8px" }}
                />{" "}
                Processing...
              </>
            ) : (
              "Predict Match Outcome"
            )}
          </button>
        </div>

        {/* Naming Convention */}
        <div className="team-list-wrapper">
          <p className="team-list-header">Accepted Naming Conventions:</p>
          <div className="team-tags-container">{highlightedTeamNames}</div>
        </div>

        {/* Error Message */}
        {error && (
          <p className="error-message">
            <AlertTriangleIcon
              style={{ width: "20px", height: "20px", marginRight: "8px" }}
            />{" "}
            {error}
          </p>
        )}

        {/* Prediction Results */}
        {predictionResult && (
          <div
            className={`result-box ${
              predictionResult.outcome === "Draw" ? "draw" : "win"
            }`}
          >
            <h3 className="result-header">Prediction Result:</h3>

            <p className="score-line">
              {homeTeam} &nbsp;
              <span className="home-score">{predictionResult.homeGoals}</span>
              <span className="separator">-</span>
              <span className="away-score">{predictionResult.awayGoals}</span>
              &nbsp;
              {awayTeam}
            </p>

            <div className="outcome-message-wrapper">
              {predictionResult.outcome === "Home Win" && (
                <p className="outcome-message win-color animate-bounce">
                  The match result prediction: {homeTeam} wins the match!
                </p>
              )}
              {predictionResult.outcome === "Away Win" && (
                <p className="outcome-message win-color animate-bounce">
                  The match result prediction: {awayTeam} wins the match!
                </p>
              )}
              {predictionResult.outcome === "Draw" && (
                <p className="outcome-message draw-color">
                  The match result prediction: The match ends in a draw!
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default PremierLeaguePage;
