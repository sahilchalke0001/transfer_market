import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import HeroImage from "../assets/Hero.png";
import "./Hero.css";
import { FiSend } from "react-icons/fi";

/** Where the Flask API lives (set Vite env or fallback to localhost:5000) */
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const Hero = () => {
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatWindowRef = useRef(null);

  const { user, isSignedIn } = useUser();

  /* ---------- Auto‑scroll chat window ---------- */
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTo({
        top: chatWindowRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chatLog, loading]);

  /* ---------- Persist chat in Mongo ---------- */
  const saveChatToDB = async (messagesArray) => {
    if (!user?.id || !Array.isArray(messagesArray) || !messagesArray.length) {
      console.warn("⚠️ Invalid user or messages. Skipping DB save.");
      return;
    }

    const payload = {
      clerkUserId: user.id,
      messages: messagesArray.map((m) => ({
        role: m.role === "model" ? "bot" : m.role,
        text: m.text,
      })),
    };

    try {
      const res = await fetch(`${API_BASE}/api/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) console.error("❌ Save error:", await res.json());
    } catch (err) {
      console.error("❌ Error saving chat:", err);
    }
  };

  /* ---------- Handle submit ---------- */
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMsg = { role: "user", text: message };
    setChatLog((prev) => [...prev, userMsg]);
    setShowChat(true);
    setMessage("");
    setLoading(true);
    await saveChatToDB([userMsg]);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: message,
          senderId: user?.id || "anonymous", // ✅ Clerk user ID
          senderName: user?.fullName || "Anonymous", // ✅ Clerk name
          senderEmail:
            user?.primaryEmailAddress?.emailAddress || "unknown@example.com", // ✅ Clerk email
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.statusText}`);

      const data = await res.json();
      const botMsg = { role: "model", text: data.answer || "No response" };
      setChatLog((prev) => [...prev, botMsg]);
      await saveChatToDB([botMsg]);
    } catch (err) {
      const errorBotMsg = { role: "model", text: "❌ Error. Try again." };
      setChatLog((prev) => [...prev, errorBotMsg]);
      await saveChatToDB([errorBotMsg]);
      console.error("Chat error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="hero-wrapper">
      <div className={`hero-content ${showChat ? "with-chat" : ""}`}>
        <img src={HeroImage} alt="Hero" className="hero-image" />

        {showChat && (
          <div className="chat-window" ref={chatWindowRef}>
            {chatLog.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                <span>{msg.text}</span>
              </div>
            ))}
            {loading && <div className="chat-message model">Typing...</div>}
          </div>
        )}
      </div>

      {isSignedIn ? (
        <form className="chatbot-search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Ask your chatbot..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !message.trim()}>
            <FiSend size={20} />
          </button>
        </form>
      ) : (
        <p className="chatbot-login-warning">
          🔒 Please{" "}
          <a href="/sign-in" style={{ color: "#2563eb" }}>
            sign in
          </a>{" "}
          to use the chatbot.
        </p>
      )}
    </div>
  );
};

export default Hero;
