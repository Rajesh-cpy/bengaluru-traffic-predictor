from flask import Flask, request, jsonify
import pandas as pd
import joblib
import numpy as np
from datetime import datetime

app = Flask(__name__)

# ====================================================
# Load Model and Preprocessors
# ====================================================
try:
    model = joblib.load("bengaluru_traffic_model.pkl")
    encoders = joblib.load("label_encoders.pkl")
    target_scaler = joblib.load("target_scaler.pkl")
    print("✅ Model, encoders, and scaler loaded successfully.")
except Exception as e:
    print(f"❌ Error loading model or encoders: {e}")

# ====================================================
# Preprocessing Function (aligned with training)
# ====================================================
def preprocess_input(data):
    df = pd.DataFrame([data])

    # Convert Date → Extract features
    if "Date" in df.columns:
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
        df["Year"] = df["Date"].dt.year
        df["Month"] = df["Date"].dt.month
        df["Day"] = df["Date"].dt.day
        df["DayOfWeek"] = df["Date"].dt.dayofweek
        df.drop(columns=["Date"], inplace=True)

    # Hour context (use backend hour)
    if "Hour" in data and data["Hour"] is not None:
        df["Hour"] = int(data["Hour"])
    else:
        df["Hour"] = datetime.now().hour

    # Traffic Hour Weight (peak hour importance)
    def hour_weight(h):
        if 0 <= h < 5:
            return 0.2
        elif 7 <= h < 10 or 17 <= h < 20:
            return 1.0
        elif 10 <= h < 16:
            return 0.6
        else:
            return 0.3

    df["Traffic_Hour_Weight"] = df["Hour"].apply(hour_weight)

    # Encode categorical
    categorical_cols = [
        "Area Name",
        "Road/Intersection Name",
        "Weather Conditions",
        "Roadwork and Construction Activity",
    ]
    for col in categorical_cols:
        if col in df.columns and col in encoders:
            le = encoders[col]
            df[col] = df[col].apply(lambda x: x if x in le.classes_ else le.classes_[0])
            df[col] = le.transform(df[col])

    # Feature Engineering (must match training)
    df["Volume_to_Capacity"] = (data.get("Traffic Volume", 1) /
                                (data.get("Road Capacity Utilization", 85) + 1)) * (1 + df["Traffic_Hour_Weight"])

    df["Speed_Index"] = data.get("Travel Time Index", 1) * (1 + df["Traffic_Hour_Weight"])

    df["Traffic_Intensity"] = (
        (data.get("Traffic Volume", 10000) /
         (data.get("Pedestrian and Cyclist Count", 100) + 1)) *
        (1 + df["Traffic_Hour_Weight"])
    )

    df["Congestion_to_Capacity"] = (
        data.get("Congestion Level", 50) /
        (data.get("Road Capacity Utilization", 85) + 1) *
        (0.5 + df["Traffic_Hour_Weight"])
    )

    # Keep only model training columns
    training_features = model.feature_names_in_ if hasattr(model, "feature_names_in_") else df.columns
    df = df.reindex(columns=training_features, fill_value=0)

    return df

# ====================================================
# Prediction Endpoint
# ====================================================
@app.route("/predict", methods=["POST"])
def predict():
    try:
        input_data = request.get_json()

        # Weather values (optional)
        weather = input_data.get("Weather", {})
        input_data["Weather_Temp"] = weather.get("temp", 25)
        input_data["Weather_Humidity"] = weather.get("humidity", 60)
        input_data["Weather_Wind"] = weather.get("wind", 5)

        # Use hour from Node backend
        request_hour = int(input_data.get("Hour", datetime.now().hour))

        # Time Context
        if request_hour < 5:
            time_label = "Low Congestion (Nighttime)"
        elif 7 <= request_hour <= 10 or 17 <= request_hour <= 20:
            time_label = "Heavy Congestion (Peak Hour)"
        elif 10 <= request_hour <= 16:
            time_label = "Moderate Flow (Daytime)"
        else:
            time_label = "Light Congestion (Evening)"

        input_data["Time_Context"] = time_label

        # PREPROCESS
        processed_df = preprocess_input(input_data)

        # Predict scaled outputs
        prediction_scaled = model.predict(processed_df)
        prediction = target_scaler.inverse_transform(prediction_scaled)

        # Extract values
        raw_volume = float(prediction[0][0])
        avg_speed = float(prediction[0][1])
        congestion = float(prediction[0][2])

        # ====================================================
        # REALISTIC VEHICLES-PER-HOUR SCALING (NEW!)
        # ====================================================
        scaled_volume = raw_volume * (congestion / 100)

        # Clamp to realistic Bengaluru highway/local road ranges
        scaled_volume = max(300, min(scaled_volume, 18000))

        result = {
            "Traffic Volume": round(scaled_volume, 2),  # vehicles per hour (REALISTIC)
            "Average Speed": round(avg_speed, 2),
            "Congestion Level": round(congestion, 2),
            "Time Context": time_label,
            "Hour Evaluated": request_hour,
        }

        print("🚦 Predicted:", result)
        return jsonify(result)

    except Exception as e:
        print("❌ Error during prediction:", e)
        return jsonify({"error": str(e)})

# ====================================================
# Run Flask Server
# ====================================================
if __name__ == "__main__":
    print("🚀 Starting Bengaluru Traffic Prediction ML Service...")
    app.run(host="0.0.0.0", port=5000)
