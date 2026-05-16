import React, { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import "./LaLigaPage.css";

/* Placeholder array for team names */
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

const HALA_MADRID_AUDIO = "/Himno_Real_Madrid_Hala_Madrid_y_Nada_Más.ogg";

function LaLigaPage() {
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [predictionResult, setPredictionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { isSignedIn, isLoaded } = useUser();

  /* 🔊 Audio refs (NO UI) */
  const audioRef = useRef(null);
  const stopTimeoutRef = useRef(null);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
  };

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
    stopAudio(); // stop any previous audio

    try {
      const response = await fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          home_team: homeTeam,
          away_team: awayTeam,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch prediction");

      const data = await response.json();

      setPredictionResult({
        homeGoals: data.home_goals,
        awayGoals: data.away_goals,
        outcome: data.result,
      });

      /* 🏆 PLAY ANTHEM ONLY IF REAL MADRID WINS */
      const madridHomeWin =
        homeTeam.toLowerCase() === "real madrid" &&
        data.home_goals > data.away_goals;

      const madridAwayWin =
        awayTeam.toLowerCase() === "real madrid" &&
        data.away_goals > data.home_goals;

      if (madridHomeWin || madridAwayWin) {
        audioRef.current = new Audio(HALA_MADRID_AUDIO);
        audioRef.current.volume = 0.8;
        audioRef.current.play().catch(() => {});

        /* ⏱️ Stop after 10 seconds */
        stopTimeoutRef.current = setTimeout(stopAudio, 90000);
      }
    } catch (err) {
      console.error("Prediction error:", err);
      setError("Prediction failed. Ensure your Flask server is running.");
    } finally {
      setLoading(false);
    }
  };

  /* Cleanup on unmount */
  useEffect(() => {
    return () => stopAudio();
  }, []);

  /* Auth loading */
  if (!isLoaded) {
    return (
      <div className="laliga-page-container text-center py-10">
        <h2 className="text-xl text-gray-500">
          Loading authentication status...
        </h2>
      </div>
    );
  }

  /* Not signed in */
  if (!isSignedIn) {
    return (
      <div className="laliga-page-container">
        <h2 className="laliga-title">LaLiga Match Predictor </h2>
        <p className="chatbot-login-warning">
          🔒 Please <a href="/sign-in">sign in</a> to use the La Liga predictor
          tool.
        </p>
      </div>
    );
  }

  /* Main UI (UNCHANGED) */
  return (
    <div className="laliga-page-container">
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
