import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import "./FootballChat.css";

function FootballChat() {
  const { isSignedIn, isLoaded, user } = useUser();
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch messages every 3s
  useEffect(() => {
    if (!isSignedIn) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/api/messages");
        const data = await res.json();
        setChat(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [isSignedIn]);

  if (!isLoaded) return <p>Loading...</p>;

  if (!isSignedIn) {
    return (
      <div className="chat-container">
        <div className="Rutu2">
          <p>
            🔒 Please{" "}
            <a href="/sign-in" id="rutu2">
              sign in
            </a>{" "}
            to chat with others.
          </p>
        </div>
      </div>
    );
  }

  const sendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    try {
      await fetch("http://127.0.0.1:5000/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user.id,
          senderName: user.fullName,
          senderEmail: user.emailAddresses[0].emailAddress, // ✅ add email
          text: message,
        }),
      });
      setMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <h2>⚽ Football Community Chat</h2>

      <div className="chat-box">
        {chat.map((msg, idx) => (
          <div key={idx} className="chat-message">
            <div className="chat-user-email">{msg.senderEmail}</div>{" "}
            <div className="chat-user-text">{msg.text}</div>
          </div>
        ))}
        {loading && <div className="chat-message">Sending...</div>}
      </div>

      <div className="chat-input">
        <input
          type="text"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default FootballChat;
