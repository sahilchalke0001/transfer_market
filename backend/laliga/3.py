from flask import Flask, request, jsonify
import pandas as pd
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from flask_cors import CORS

app = Flask(__name__)

# ✅ Enable CORS for React app (assuming React runs on 5173)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

# ✅ Load & preprocess La Liga data
# Example CSV columns: ["HomeTeam", "AwayTeam", "FTHG", "FTAG", "FTR"]
matches = pd.read_csv(r"C:\Users\Sahil\Desktop\s\backend\LaLiga\laligadata.csv")
matches.dropna(inplace=True)

# ✅ Feature engineering
matches["goal_difference"] = matches["FTHG"] - matches["FTAG"]
matches["home_team_form"] = (
    matches.groupby("HomeTeam")["goal_difference"].rolling(5).mean().reset_index(level=0, drop=True)
)
matches["away_team_form"] = (
    matches.groupby("AwayTeam")["goal_difference"].rolling(5).mean().reset_index(level=0, drop=True)
)

# ✅ Feature selection
features = ["HomeTeam", "AwayTeam", "home_team_form", "away_team_form"]
X = matches[features].fillna(0)
y_home = matches["FTHG"]
y_away = matches["FTAG"]

# ✅ Preprocessing pipeline
numeric_features = ["home_team_form", "away_team_form"]
categorical_features = ["HomeTeam", "AwayTeam"]

numeric_transformer = StandardScaler()
categorical_transformer = OneHotEncoder(handle_unknown="ignore")

preprocessor = ColumnTransformer(
    transformers=[
        ("num", numeric_transformer, numeric_features),
        ("cat", categorical_transformer, categorical_features),
    ]
)

X_preprocessed = preprocessor.fit_transform(X)

# ✅ Train RandomForest models
home_model = RandomForestRegressor(n_estimators=100, random_state=42)
away_model = RandomForestRegressor(n_estimators=100, random_state=42)

home_model.fit(X_preprocessed, y_home)
away_model.fit(X_preprocessed, y_away)

# ✅ Custom rounding for predictions
def custom_round(value):
    return int(value + 0.5)

# 🚀 FIX: The route is now set to "/predict" to resolve the 404 error
@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    home_team = data.get("home_team")
    away_team = data.get("away_team")

    if not home_team or not away_team:
        return jsonify({"error": "Please provide both home_team and away_team"}), 400

    if home_team == away_team:
        return jsonify({"error": "Home and Away team cannot be the same"}), 400

    # ✅ Compute recent form
    def team_form(team, column):
        team_matches = matches[matches[column] == team]["goal_difference"].tail(5)
        return team_matches.mean() if not team_matches.empty else 0

    home_team_form = team_form(home_team, "HomeTeam")
    away_team_form = team_form(away_team, "AwayTeam")

    # ✅ Prepare match input
    new_match = pd.DataFrame(
        {
            "HomeTeam": [home_team],
            "AwayTeam": [away_team],
            "home_team_form": [home_team_form],
            "away_team_form": [away_team_form],
        }
    )

    new_match_preprocessed = preprocessor.transform(new_match)

    # ✅ Predict goals
    home_goals = custom_round(home_model.predict(new_match_preprocessed)[0])
    away_goals = custom_round(away_model.predict(new_match_preprocessed)[0])

    # ✅ Determine match result
    if home_goals > away_goals:
        result = "Home Win"
    elif away_goals > home_goals:
        result = "Away Win"
    else:
        result = "Draw"

    return jsonify(
        {"home_goals": home_goals, "away_goals": away_goals, "result": result}
    )

# ✅ Run app
if __name__ == "__main__":
    # Note: Running on port 5000 is the standard for Flask
    app.run(debug=True)
