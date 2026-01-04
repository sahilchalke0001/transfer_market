import React, { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import Plot from "react-plotly.js";
import "./PlayerValuationPage.css";
import valImage from "../assets/Val.png";

function PlayerValuationPage() {
  const { isLoaded, isSignedIn } = useUser();

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    dribbling_reflexes: "",
    passing_kicking: "",
    shooting_handling: "",
    total_mentality: "",
    shot_power: "",
    total_power: "",
    ball_control: "",
    finishing: "",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [predicted, setPredicted] = useState(false);

  if (!isLoaded) return <p>Loading authentication...</p>;

  if (!isSignedIn)
    return (
      <div
        className="valuation-container"
        style={{
          backgroundImage: `url(${valImage})`,
        }}
      >
        <h2>Player Market Value Predictor</h2>
        <p className="auth-warning">
          🔒 Please{" "}
          <a href="/sign-in" style={{ color: "#2563eb" }}>
            sign in
          </a>{" "}
          to access this feature.
        </p>
      </div>
    );

  const handleChange = (e) => {
    const { name, value, min, max, type } = e.target;

    if (type === "text") {
      // For name or text inputs
      setFormData({ ...formData, [name]: value });
    } else {
      // For numeric inputs, enforce range limits
      if (
        value === "" ||
        (Number(value) >= Number(min) && Number(value) <= Number(max))
      ) {
        setFormData({ ...formData, [name]: value });
      }
    }
  };

  const handlePredict = async () => {
    // Check for empty fields
    for (const key in formData) {
      if (formData[key] === "") {
        setError("Please fill all fields before predicting.");
        return;
      }
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setPredicted(false);

    try {
      const response = await fetch("http://127.0.0.1:5000/predict_player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.status === "success") {
        setResult(data.predicted_market_value.toFixed(2));
        setPredicted(true);
      } else {
        setError("Prediction failed. Try again later.");
      }
    } catch (err) {
      console.error(err);
      setError("Server error. Please ensure Flask backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // 📊 Radar Chart Data
  const radarCategories = [
    "Age",
    "Dribbling/Reflexes",
    "Passing/Kicking",
    "Shooting/Handling",
    "Total Mentality",
    "Shot Power",
    "Total Power",
    "Ball Control",
    "Finishing",
  ];

  const radarValues = [
    formData.age || 0,
    formData.dribbling_reflexes || 0,
    formData.passing_kicking || 0,
    formData.shooting_handling || 0,
    (formData.total_mentality || 0) / 5,
    formData.shot_power || 0,
    (formData.total_power || 0) / 5,
    formData.ball_control || 0,
    formData.finishing || 0,
  ];

  // 📄 Download Report Function
  const handleDownloadReport = () => {
    const report = `
Player Name: ${formData.name}
Age: ${formData.age}

Player Attributes:
- Dribbling/Reflexes: ${formData.dribbling_reflexes}
- Passing/Kicking: ${formData.passing_kicking}
- Shooting/Handling: ${formData.shooting_handling}
- Total Mentality: ${formData.total_mentality}
- Shot Power: ${formData.shot_power}
- Total Power: ${formData.total_power}
- Ball Control: ${formData.ball_control}
- Finishing: ${formData.finishing}

Predicted Market Value: €${result} Million
    `;

    const blob = new Blob([report], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${formData.name}_valuation_report.txt`;
    link.click();
  };

  return (
    <div className="valuation-container">
      <h2>Player Market Value Predictor</h2>

      <div className="form-container">
        {[
          {
            key: "name",
            label: "PLAYER NAME",
            type: "text",
            placeholder: "e.g. Cristiano Ronaldo",
          },
          { key: "age", label: "AGE", min: 14, max: 50, placeholder: "14–50" },
          {
            key: "dribbling_reflexes",
            label: "DRIBBLING REFLEXES",
            min: 0,
            max: 100,
            placeholder: "0–100",
          },
          {
            key: "passing_kicking",
            label: "PASSING ",
            min: 0,
            max: 100,
            placeholder: "0–100",
          },
          {
            key: "shooting_handling",
            label: "SHOOTING HANDLING",
            min: 0,
            max: 100,
            placeholder: "0–100",
          },
          {
            key: "total_mentality",
            label: "TOTAL STRENGTH",
            min: 0,
            max: 500,
            placeholder: "0–500",
          },
          {
            key: "shot_power",
            label: "SHOT POWER",
            min: 0,
            max: 100,
            placeholder: "0–100",
          },
          {
            key: "total_power",
            label: "TOTAL POWER",
            min: 0,
            max: 500,
            placeholder: "0–500",
          },
          {
            key: "ball_control",
            label: "BALL CONTROL",
            min: 0,
            max: 100,
            placeholder: "0–100",
          },
          {
            key: "finishing",
            label: "FINISHING",
            min: 0,
            max: 100,
            placeholder: "0–100",
          },
        ].map(({ key, label, type = "number", min, max, placeholder }) => (
          <div key={key} className="input-group">
            <label>{label}</label>
            <input
              type={type}
              name={key}
              min={min}
              max={max}
              value={formData[key]}
              placeholder={placeholder}
              onChange={handleChange}
            />
          </div>
        ))}

        <button
          onClick={handlePredict}
          disabled={loading}
          className="predict-button"
        >
          {loading ? "Predicting..." : "Predict Market Value"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {/* 📈 Radar Chart — Visible but disabled before prediction */}
      <div
        className={`radar-section ${!predicted ? "disabled-section" : ""}`}
        title={!predicted ? "Predict first to view radar chart" : ""}
      >
        <Plot
          data={[
            {
              type: "scatterpolar",
              r: radarValues,
              theta: radarCategories,
              fill: "toself",
              name: formData.name || "Player",
            },
          ]}
          layout={{
            polar: { radialaxis: { visible: true, range: [0, 100] } },
            showlegend: false,
            paper_bgcolor: "transparent",
            font: { color: "white" },
          }}
          style={{ width: "100%", height: "450px" }}
          config={{ staticPlot: !predicted }}
        />
      </div>

      {/* 📥 Download Button — Disabled until prediction */}
      <button
        className={`download-button ${!predicted ? "disabled-btn" : ""}`}
        onClick={handleDownloadReport}
        disabled={!predicted}
      >
        📄 Download Report
      </button>

      {result && (
        <div className="result-card">
          <h3>
            Predicted Market Value for {formData.name}: €{result} Million
          </h3>
        </div>
      )}
    </div>
  );
}

export default PlayerValuationPage;
