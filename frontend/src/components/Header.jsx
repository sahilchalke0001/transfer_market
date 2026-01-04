import { useNavigate } from "react-router-dom";
import "./Header.css";
import { motion } from "framer-motion";
import fcbLogo from "../assets/download.png";
import { SignedOut, SignedIn, useUser } from "@clerk/clerk-react";
import { FaSignInAlt, FaSignOutAlt } from "react-icons/fa";

function Header() {
  const { user } = useUser();
  const navigate = useNavigate();

  const sectors = [
    { name: "La Liga", path: "/laliga" },
    { name: "Premier League", path: "/premierleague" },
    { name: "Bundesliga", path: "/bundesliga" },
    { name: "Serie A", path: "/seriea" },
    { name: "chat-bot", path: "/" },
    { name: "Football News", path: "/news" },
    { name: "Player Valuation", path: "/player-valuation" },
    { name: "Football Matches", path: "/matches" },
    { name: "Player Detection", path: "/player-detection" },
    { name: "Live Chat", path: "/chat" },
  ];

  return (
    <motion.header
      className="chatbot-header"
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="chatbot-header-content">
        <img src={fcbLogo} alt="Logo" className="madrid-logo" />
        <h1>Cristiano Ronaldo</h1>
        <img src={fcbLogo} alt="Logo" className="madrid-logo" />
      </div>

      <p>🔵⚪ Hala Madrid! ⚪🔵</p>

      {/* Navigation Sectors */}
      <nav className="league-nav">
        {sectors.map((sector, index) => (
          <motion.button
            key={index}
            className="league-btn"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(sector.path)}
          >
            {sector.name}
          </motion.button>
        ))}
      </nav>

      {/* Sign In / Out Buttons */}
      <div className="sign-button-container">
        <SignedOut>
          <button className="sign-button" onClick={() => navigate("/sign-in")}>
            <FaSignInAlt style={{ marginRight: "8px" }} />
            Sign In
          </button>
        </SignedOut>

        <SignedIn>
          {user ? (
            <button
              className="sign-button"
              onClick={() => navigate("/sign-out")}
            >
              <FaSignOutAlt style={{ marginRight: "8px" }} />
              Sign Out
            </button>
          ) : null}
        </SignedIn>
      </div>
    </motion.header>
  );
}

export default Header;
