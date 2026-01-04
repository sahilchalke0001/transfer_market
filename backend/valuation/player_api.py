from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import os

app = Flask(__name__)
CORS(app, resources={r"/predict_player": {"origins": "http://localhost:5173"}})

# Load trained models from models.pkl
MODEL_PATH = r"C:\Users\Sahil\Desktop\s\backend\valuation\models.pkl"

with open(MODEL_PATH, 'rb') as f:
    models = pickle.load(f)

model = models.get('RandomForest')

@app.route('/predict_player', methods=['POST'])
def predict_player():
    try:
        data = request.get_json()
        features = np.array([[ 
            data['age'], 
            data['dribbling_reflexes'], 
            data['passing_kicking'], 
            data['shooting_handling'],
            data['total_mentality'], 
            data['shot_power'], 
            data['total_power'], 
            data['ball_control'], 
            data['finishing'] 
        ]])
        log_value = model.predict(features)[0]
        value_million = float(np.exp(log_value) / 1_000_000)
        return jsonify({
            "predicted_market_value": value_million,
            "status": "success"
        })
    except Exception as e:
        return jsonify({"error": str(e), "status": "failed"}), 500

if __name__ == '__main__':
    app.run(debug=True)
