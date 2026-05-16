import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import "./FootballMatches.css";

/* 🔥 Top 5 European Leagues */
const TOP_5_LEAGUES = [
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
];

function FootballMatches() {
  const { isLoaded, isSignedIn } = useUser();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("⚽ Today’s Football Matches");

  useEffect(() => {
    if (!isSignedIn) return;

    const fetchMatches = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("http://127.0.0.1:5000/live-matches-today");
        if (!res.ok) throw new Error("API failed");

        const data = await res.json();

        /* 🟢 LIVE or TODAY matches */
        if (data.matches && Array.isArray(data.matches)) {
          setTitle(
            data.type === "live"
              ? "🔴 Live Football Matches (Top 5 Leagues)"
              : "⚽ Today’s Football Matches (Top 5 Leagues)"
          );

          const filteredMatches = data.matches
            .filter((m) => TOP_5_LEAGUES.includes(m.league))
            .slice(0, 5);

          setMatches(
            filteredMatches.map((m, i) => ({
              id: i,
              homeName: m.home_team,
              awayName: m.away_team,
              homeScore: m.home_score ?? 0,
              awayScore: m.away_score ?? 0,
              status: m.status,
              minute: m.minute,
              league: m.league,
            }))
          );
          return;
        }

        /* 🟡 NO matches today → FUTURE matches */
        if (data.type === "none") {
          const futureRes = await fetch("http://127.0.0.1:5000/future-matches");

          if (!futureRes.ok) throw new Error("Future API failed");

          const futureData = await futureRes.json();

          setTitle("📅 Upcoming Football Matches (Top 5 Leagues)");

          const filteredFuture = futureData
            .filter((m) => TOP_5_LEAGUES.includes(m.league))
            .slice(0, 5);

          setMatches(
            filteredFuture.map((m, i) => ({
              id: i,
              homeName: m.home_team,
              awayName: m.away_team,
              homeScore: 0,
              awayScore: 0,
              status: m.date,
              minute: null,
              league: m.league,
            }))
          );
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load football matches.");
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, [isSignedIn]);

  if (!isLoaded) return <p>Loading authentication...</p>;

  if (!isSignedIn) {
    return (
      <div className="football-container">
        <h2>{title}</h2>
        <div className="Rutu1">
          🔒 Please <a href="/sign-in">sign in</a> to view matches.
        </div>
      </div>
    );
  }

  return (
    <div className="football-container">
      <h2>{title}</h2>

      {loading && <p>Loading matches...</p>}

      {!loading && error && <p className="error-message">🚨 {error}</p>}

      {!loading && !error && matches.length === 0 && (
        <p>No Top 5 league matches available.</p>
      )}

      {!loading && !error && matches.length > 0 && (
        <div className="match-list">
          {matches.map((m) => (
            <div key={m.id} className="match-card">
              <div className="teams">
                {m.homeName} <strong>vs</strong> {m.awayName}
              </div>

              <div className="score">
                {m.minute !== null ? (
                  <>
                    🔴 LIVE {m.homeScore} - {m.awayScore} ({m.minute}')
                  </>
                ) : (
                  <>{m.status}</>
                )}
              </div>

              <div className="league">{m.league}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FootballMatches;
