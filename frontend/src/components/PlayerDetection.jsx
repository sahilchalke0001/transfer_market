import React, { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import "./PlayerDetection.css";

function PlayerDetection() {
  const { isSignedIn, isLoaded } = useUser(); // Clerk Authentication
  const [videoFile, setVideoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState(null);

  // 🎥 Handle File Selection
  const handleFileChange = (e) => {
    setVideoFile(e.target.files[0]);
    setError("");
    setResultUrl(null);
  };

  // 🚀 Handle Upload & Detection
  const handleDetect = async () => {
    if (!videoFile) {
      setError("Please upload a football video first.");
      return;
    }

    setLoading(true);
    setError("");
    setResultUrl(null);

    try {
      const formData = new FormData();
      formData.append("video", videoFile);

      const response = await fetch("http://127.0.0.1:5000/detect", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errMsg = await response.text();
        throw new Error(`Backend error: ${errMsg}`);
      }

      const data = await response.json();

      if (data.processed_video_url) {
        setResultUrl(data.processed_video_url); // ✅ FIXED
      } else {
        setError("⚠️ No processed video returned. Please try again.");
      }
    } catch (err) {
      console.error("Detection error:", err);
      setError("⚠️ Player detection failed. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  // 🕒 Wait for Clerk to Load
  if (!isLoaded) {
    return (
      <div className="player-detect-container">
        <h2 className="loading-text">Loading authentication status...</h2>
      </div>
    );
  }

  // 🔒 Require Sign-in
  if (!isSignedIn) {
    return (
      <div className="player-detect-container">
        <h2 className="player-detect-title">Football Player Detection</h2>
        <p className="auth-warning">
          🔒 Please{" "}
          <a href="/sign-in" className="sign-in-link">
            sign in
          </a>{" "}
          to use the Player Detection tool.
        </p>
      </div>
    );
  }

  // ✅ Show UI when Signed In
  return (
    <div className="player-detect-container">
      <h2 className="player-detect-title">Football Player Detection</h2>

      <div className="upload-section">
        <input
          type="file"
          id="videoUpload"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden-input"
        />
        <label htmlFor="videoUpload" className="custom-file-button">
          🎥 Choose File
        </label>

        <button
          onClick={handleDetect}
          disabled={loading}
          className="detect-button"
        >
          {loading ? "Processing..." : "Start Detection"}
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      {resultUrl && (
        <div className="result-section">
          <h3> Processed Video Preview</h3>
          <video src={resultUrl} controls className="video-preview" />
          <p className="success-message">
            Player detection completed successfully!
          </p>
        </div>
      )}
    </div>
  );
}

export default PlayerDetection;
