import pandas as pd
from sklearn.ensemble import RandomForestRegressor, BaggingRegressor, GradientBoostingRegressor, AdaBoostRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import root_mean_squared_error, mean_absolute_error
import numpy as np
import pickle
import os
from catboost import CatBoostRegressor
from xgboost import XGBRegressor


def create_models(data):
    # Select features
    selected_features = [
        'Age', 'Dribbling / Reflexes', 'Passing / Kicking', 'Shooting / Handling',
        'Total mentality', 'Shot power', 'Total power', 'Ball control', 'Finishing'
    ]

    # Prepare features and target
    X = data[selected_features]
    y = data['Log Market Value']

    # Split dataset
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    models = {}

    # --- 1️⃣ Random Forest ---
    rf = RandomForestRegressor(random_state=42)
    rf.fit(X_train, y_train)
    models['RandomForest'] = rf

    # --- 2️⃣ Bagging Regressor ---
    bagging = BaggingRegressor(
        estimator=RandomForestRegressor(n_estimators=50, random_state=42),
        n_estimators=10,
        random_state=42
    )
    bagging.fit(X_train, y_train)
    models['Bagging'] = bagging

    # --- 3️⃣ Gradient Boosting ---
    boosting = GradientBoostingRegressor(
        n_estimators=200, learning_rate=0.1, random_state=42
    )
    boosting.fit(X_train, y_train)
    models['GradientBoosting'] = boosting

    # --- 4️⃣ AdaBoost ---
    adaboost = AdaBoostRegressor(
        n_estimators=200, learning_rate=0.1, random_state=42
    )
    adaboost.fit(X_train, y_train)
    models['AdaBoost'] = adaboost

    # --- 5️⃣ XGBoost ---
    xgb = XGBRegressor(
        n_estimators=500,
        learning_rate=0.05,
        max_depth=8,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        objective='reg:squarederror',
        verbosity=0
    )
    xgb.fit(X_train, y_train)
    models['XGBoost'] = xgb

    # --- 6️⃣ CatBoost ---
    catboost = CatBoostRegressor(
        iterations=500,
        learning_rate=0.05,
        depth=8,
        loss_function='RMSE',
        random_seed=42,
        verbose=0
    )
    catboost.fit(X_train, y_train)
    models['CatBoost'] = catboost

    # --- 📊 Evaluate all models ---
    print("\n🔍 Model Performance Comparison:")
    results = []

    for name, model in models.items():
        y_pred = model.predict(X_val)
        train_score = model.score(X_train, y_train)
        val_score = model.score(X_val, y_val)
        rmse = root_mean_squared_error(y_val, y_pred)
        mae = mean_absolute_error(y_val, y_pred)

        print(f"\n{name} train score: {train_score:.4f}")
        print(f"{name} validation (R²): {val_score:.4f}")
        print(f"{name} RMSE: {rmse:.4f}")
        print(f"{name} MAE: {mae:.4f}")

        results.append({
            'Model': name,
            'Train R²': round(train_score, 4),
            'Validation R²': round(val_score, 4),
            'RMSE': round(rmse, 4),
            'MAE': round(mae, 4)
        })

    results_df = pd.DataFrame(results).sort_values(by='Validation R²', ascending=False)
    print("\n📋 Summary Table:")
    print(results_df.to_string(index=False))

    return models


def get_clean_data():
    data_path = os.path.join(os.getcwd(), "data.csv")
    data = pd.read_csv(data_path)

    mask = data['Value'] > 0
    data.loc[mask, 'Log Market Value'] = np.log(data.loc[mask, 'Value'])
    data = data.dropna(subset=['Log Market Value'])

    return data


def main():
    data = get_clean_data()
    models = create_models(data)

    # Save all models in one pickle file
    with open('models.pkl', 'wb') as f:
        pickle.dump(models, f)

    print("\n All models saved successfully in 'models.pkl'.")


if __name__ == '__main__':
    main()
