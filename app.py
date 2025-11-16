import flask
from flask import Flask, render_template, request, jsonify
import joblib
import json
import numpy as np
import os
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
app = Flask(
    __name__,
    template_folder='templates', 
    static_folder='static'      
)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, '05_models')
MODEL_PATH = os.path.join(MODEL_DIR, 'final_model.pkl')
ENCODINGS_PATH = os.path.join(MODEL_DIR, 'categorical_encodings.json')
FEATURE_SCHEMA = [
    'crop_year', 
    'annual_rainfall', 
    'fertilizer', 
    'pesticide', 
    'n_soil', 
    'p_soil', 
    'k_soil', 
    'ph_soil', 
    'crop',         
    'season',       
    'state'         
]
assets = {}

def load_assets():
    """
    Loads all critical assets (model, encoders) into memory.
    This is a production-safe way to load once on startup.
    """
    logging.info("--- Loading critical assets ---")
    try:
        assets['model'] = joblib.load(MODEL_PATH)
        logging.info(f"Model loaded successfully from: {MODEL_PATH}")
    except Exception as e:
        logging.critical(f"FATAL ERROR: Could not load model. Error: {e}")
        assets['model'] = None

    try:
        with open(ENCODINGS_PATH, 'r') as f:
            assets['encodings'] = json.load(f)
        logging.info(f"Encodings loaded successfully from: {ENCODINGS_PATH}")
    except Exception as e:
        logging.critical(f"FATAL ERROR: Could not load encodings. Error: {e}")
        assets['encodings'] = None

load_assets()

@app.route('/')
def home():
    """
    Renders the main web page (index.html) and passes
    the dynamic lists for the dropdown menus.
    """
    if 'encodings' not in assets or assets['encodings'] is None:
        logging.error("Encodings not loaded. Cannot render homepage.")
        return "Critical Error: Server configuration issue. Check logs.", 500

    return render_template(
        'index.html',
        crops=sorted(assets['encodings']['Crop']),
        states=sorted(assets['encodings']['State']),
        seasons=sorted(assets['encodings']['Season'])
    )

@app.route('/predict', methods=['POST'])
def predict():
    """
    Handles the prediction request from the frontend JavaScript.
    It expects JSON data, validates it, processes it,
    and returns a standardized JSON response.
    """
    if 'model' not in assets or assets['model'] is None:
        logging.error("Prediction failed: Model is not loaded.")
        return jsonify({
            "error": {
                "message": "Prediction model is not available. Please contact support.",
                "code": "MODEL_NOT_LOADED"
            }
        }), 503 

    if not request.is_json:
        logging.warning("Prediction failed: Request was not JSON.")
        return jsonify({
            "error": {
                "message": "Invalid request: Content-Type must be application/json.",
                "code": "BAD_REQUEST_FORMAT"
            }
        }), 400

    data = request.json
    
    missing_keys = [key for key in FEATURE_SCHEMA if key not in data]
    if missing_keys:
        logging.warning(f"Prediction failed: Missing keys {missing_keys}")
        return jsonify({
            "error": {
                "message": f"Missing required fields: {', '.join(missing_keys)}",
                "code": "MISSING_FIELDS"
            }
        }), 400

    try:
        crop_encoded = assets['encodings']['Crop'].index(data['crop'])
        state_encoded = assets['encodings']['State'].index(data['state'])
        season_encoded = assets['encodings']['Season'].index(data['season'])

        features_list = [
            float(data['crop_year']),
            float(data['annual_rainfall']),
            float(data['fertilizer']),
            float(data['pesticide']),
            float(data['n_soil']),
            float(data['p_soil']),
            float(data['k_soil']),
            float(data['ph_soil']),
            crop_encoded,
            season_encoded,
            state_encoded
        ]
        
        final_features = np.array([features_list])
        
        logging.info("Making prediction on validated data.")
        prediction = assets['model'].predict(final_features)
        predicted_yield = prediction[0]
        return jsonify({
            "data": {
                "prediction": predicted_yield,
                "unit": "Tons / Hectare"
            }
        })
        
    except ValueError as e:
        logging.warning(f"Prediction failed: Invalid data value. Error: {e}")
        return jsonify({
            "error": {
                "message": f"Invalid data provided: {str(e)}. Check that all values are correct.",
                "code": "INVALID_DATA_VALUE"
            }
        }), 400
    except Exception as e:
        logging.error(f"Prediction failed: An unexpected error occurred: {e}")
        return jsonify({
            "error": {
                "message": "An unexpected server error occurred. Please try again.",
                "code": "INTERNAL_SERVER_ERROR"
            }
        }), 500
    
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)