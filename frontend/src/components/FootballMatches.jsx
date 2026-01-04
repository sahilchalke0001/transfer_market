import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import "./FootballMatches.css";

function FootballMatches() {
  const { isLoaded, isSignedIn } = useUser();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // REAL top leagues (API-Football)
  const topLeagues = [39, 140, 135, 78, 61];

  useEffect(() => {
    if (!isSignedIn) return;

    const fetchMatches = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:5000/live-matches-today"
        );

        if (!response.ok) throw new Error("Fetch failed");

        const data = await response.json();

        const filtered =
          data.filter((m) => topLeagues.includes(m.league.id)).length > 0
            ? data.filter((m) => topLeagues.includes(m.league.id))
            : data;

        const formatted = filtered.map((match) => ({
          id: match.fixture.id,
          homeName: match.teams.home.name,
          awayName: match.teams.away.name,
          leagueId: match.league.id,
          time: new Date(match.fixture.date).toLocaleString(),
          status: match.fixture.status.short,
        }));

        setMatches(formatted);
      } catch (err) {
        setError("Unable to load football matches.");
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [isSignedIn]);

  if (!isLoaded) return <p>Loading authentication...</p>;

  if (!isSignedIn) {
    return (
      <div className="football-container">
        <h2>⚽Today’s Football Matches</h2>
        <div className="Rutu1">
          <p>
            🔒 Please{" "}
            <a href="/sign-in" id="rutu">
              sign in
            </a>{" "}
            to view matches.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="football-container">
      <h2>⚽ Today’s Football Matches</h2>

      {loading && <p>Loading matches...</p>}
      {error && <p className="error-message">🚨 {error}</p>}
      {!loading && matches.length === 0 && (
        <p>No matches scheduled for today.</p>
      )}

      <div className="match-list">
        {matches.map((match) => (
          <div key={match.id} className="match-card">
            <div className="teams">
              <span>{match.homeName}</span> <strong>vs</strong>{" "}
              <span>{match.awayName}</span>
            </div>

            <div className="score">
              {match.status === "LIVE" ? "🔴 LIVE" : "- :-"}
            </div>

            <div className="time">{match.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FootballMatches;
