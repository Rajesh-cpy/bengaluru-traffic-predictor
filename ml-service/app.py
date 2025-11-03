# filename: ml_service/app.py
import os
from flask import Flask, request, jsonify
import joblib
import pandas as pd
import numpy as np

app = Flask(__name__)

# --- Load Model ---
MODEL_PATH = 'traffic_model.joblib'
model = None
feature_names_in_ = None # Store feature names expected by the model

try:
    # Load the pipeline object
    pipeline = joblib.load(MODEL_PATH)
    print(f"--- Pipeline '{MODEL_PATH}' loaded successfully. ---")

    # Extract the final estimator (assuming it's the last step)
    # Adjust this if your pipeline structure is different
    if hasattr(pipeline, 'steps'):
        model = pipeline.steps[-1][1]
        # Get feature names expected *after* preprocessing
        # This often involves accessing the fitted preprocessor step
        preprocessor = pipeline.steps[0][1] # Assuming preprocessor is the first step
        if hasattr(preprocessor, 'get_feature_names_out'):
             # Handle potential variations in how feature names are stored/generated
            try:
                # Attempt to get feature names after transformation
                # This might need adjustment based on your specific ColumnTransformer structure
                cat_features = preprocessor.transformers_[0][1].get_feature_names_out()
                num_features = preprocessor.transformers_[1][2] # Get original names of numeric features passed through
                feature_names_in_ = np.concatenate([cat_features, num_features])
            except Exception as e:
                print(f"Warning: Could not automatically determine feature names from preprocessor: {e}")
                feature_names_in_ = None # Fallback if names can't be extracted
        else:
             print("Warning: Preprocessor does not have 'get_feature_names_out'. Cannot verify feature names.")
    else:
        # If it's not a pipeline, assume the loaded object is the model directly
        model = pipeline
        print("Warning: Loaded object is not a Pipeline. Assuming it's a model.")
        # We might not be able to easily get feature names here

    if feature_names_in_ is not None:
        print(f"--- Model expects {len(feature_names_in_)} features after preprocessing: {list(feature_names_in_)} ---")
    else:
        # Fallback to the known input columns before preprocessing if needed for validation
        feature_names_in_ = [
            'Traffic Volume', 'Average Speed', 'Congestion Level',
            'Road Capacity Utilization', 'Incident Reports', 'Public Transport Usage',
            'Parking Usage', 'Pedestrian and Cyclist Count', 'Weather Conditions',
            'Roadwork and Construction Activity'
        ]
        print(f"--- Using predefined input features for validation: {feature_names_in_} ---")


except FileNotFoundError:
    print(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    print(f"ERROR: Model file not found at '{os.path.abspath(MODEL_PATH)}'")
    print(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    model = None # Ensure model is None if loading fails
except Exception as e:
    print(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    print(f"ERROR loading model/pipeline '{MODEL_PATH}': {e}")
    print(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    model = None # Ensure model is None if loading fails

# --- Define the Raw Input Features expected from Node.js ---
# These must match exactly what Node.js sends
RAW_INPUT_FEATURES = [
    'Traffic Volume',
    'Average Speed',
    'Congestion Level',
    'Road Capacity Utilization',
    'Incident Reports',
    'Public Transport Usage',
    'Parking Usage',
    'Pedestrian and Cyclist Count',
    'Weather Conditions',
    'Roadwork and Construction Activity'
]


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    if model: # Check if the *model* specifically was loaded (might still fail if pipeline didn't contain model)
        return jsonify({"status": "OK", "message": "ML service running, model loaded."}), 200
    else:
        return jsonify({"status": "Error", "message": "ML service running, but model FAILED to load."}), 500

@app.route('/predict', methods=['POST'])
def predict():
    """Prediction endpoint - expects features, returns predicted Travel Time Index."""
    print("\n--- Received prediction request ---")
    if model is None: # Check the final estimator model
        print("!!! Model object is None, cannot predict.")
        return jsonify({"error": "Model could not be loaded or extracted from pipeline."}), 500

    try:
        data = request.get_json()
        if not data:
            print("!!! Received empty request data.")
            return jsonify({"error": "No input data provided."}), 400

        print("Received Features (raw):")
        print(data)

        # 1. Prepare data for the PIPLELINE - Create DataFrame with RAW features
        feature_values = {}
        missing_features = []
        for feature in RAW_INPUT_FEATURES:
            if feature in data:
                 # Pass raw values, let the pipeline handle types/encoding
                 # Ensure value is not None, replace with a sensible default if needed
                 feature_values[feature] = [data[feature] if data[feature] is not None else 0] # Example: replace None with 0
            else:
                missing_features.append(feature)
                print(f"ERROR: Feature '{feature}' is missing in the request data!")
                return jsonify({"error": f"Missing required feature: {feature}"}), 400
        
        # Create DataFrame in the expected order for the *pipeline input*
        try:
             input_df = pd.DataFrame(feature_values)[RAW_INPUT_FEATURES] 
             print("\nDataFrame sent to pipeline:")
             print(input_df.to_string())
        except Exception as e:
            print(f"!!! Error creating DataFrame for pipeline: {e}")
            return jsonify({"error": f"Error preparing data for prediction: {e}"}), 400


        # 2. Make the prediction using the PIPELINE object
        # The pipeline handles preprocessing (like OneHotEncoding) internally
        print("\nAttempting prediction using the pipeline...")
        prediction_result = pipeline.predict(input_df) # Use the loaded pipeline here
        print(f"Raw model output (Index?): {prediction_result}") 

        # 3. Extract the single prediction value (Travel Time Index)
        if isinstance(prediction_result, (list, np.ndarray)) and len(prediction_result) > 0:
            output_value = float(prediction_result[0])
        elif isinstance(prediction_result, (int, float, np.number)):
             output_value = float(prediction_result)
        else:
            print(f"!!! Unexpected model output format: {type(prediction_result)}, value: {prediction_result}")
            raise ValueError("Model output was not in the expected numerical format.")

        # Ensure the index is reasonable (e.g., non-negative)
        if output_value < 0:
            print(f"Warning: Predicted index {output_value} is negative. Clamping to 0.1 for calculation.")
            output_value = 0.1 # Avoid division by zero issues later maybe? Or return as is? Adjust as needed.
            
        print(f"Predicted Travel Time Index: {output_value}")
        
        # 4. Return the predicted index
        return jsonify({
            "travel_time_index": output_value # Changed key
        })

    except Exception as e:
        print(f"!!! EXCEPTION during prediction: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc() 
        return jsonify({"error": f"An error occurred during prediction processing: {str(e)}"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)