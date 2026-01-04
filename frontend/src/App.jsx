import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Footer from "./components/Footer";
import SignInPage from "./components/SignInPage";
import SignOutPage from "./components/SignOutPage";
import SignUpPage from "./components/SignUpPage";
import SyncUserWithBackend from "./clerk/SyncUserWithBackend";
import LaLigaPage from "./components/LaLigaPage";
import PremierLeaguePage from "./components/PremierLeaguePage";
import FootballNews from "./components/FootballNews";
import BundesligaPredictor from "./components/BundesligaPredictor";
import SerieAPage from "./components/SerieAPage";
import PlayerValuationPage from "./components/PlayerValuationPage";
import PlayerDetection from "./components/PlayerDetection";
import FootballChat from "./components/FootballChat";
import FootballMatches from "./components/FootballMatches";

function App() {
  const location = useLocation();

  // 🆕 NEW LOGIC: Show Header/Footer unless it's an authentication path.
  // This will show the Header/Footer on '/', '/laliga', '/premierleague', etc.
  const isAuthPage =
    location.pathname.startsWith("/sign-in") ||
    location.pathname.startsWith("/sign-up") ||
    location.pathname === "/sign-out";

  const showHeaderFooter = !isAuthPage;

  return (
    <div className="app-container">
      <SyncUserWithBackend />

      {/* Header and Footer will now be conditionally rendered based on the new logic */}
      {showHeaderFooter && <Header />}

      <main className="chatbot-main-content">
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/laliga" element={<LaLigaPage />} />
          <Route path="/premierleague" element={<PremierLeaguePage />} />
          <Route path="/bundesliga" element={<BundesligaPredictor />} />
          <Route path="/seriea" element={<SerieAPage />} />
          <Route path="/news" element={<FootballNews />} />
          <Route path="/player-valuation" element={<PlayerValuationPage />} />
          <Route path="/player-detection" element={<PlayerDetection />} />
          <Route path="/chat" element={<FootballChat />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-out" element={<SignOutPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/sign-in/sso-callback" element={<Navigate to="/" />} />
          <Route path="/sign-up/sso-callback" element={<Navigate to="/" />} />
          <Route path="/matches" element={<FootballMatches />} />
        </Routes>
      </main>

      {showHeaderFooter && <Footer />}
    </div>
  );
}

export default App;
