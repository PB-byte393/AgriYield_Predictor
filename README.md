AgriYield Predictor 🌾

This is an end-to-end machine learning project to forecast agricultural crop yield (in Tons / Hectare) based on environmental, chemical, and soil data.

This project uses a Random Forest Regressor, trained on a processed dataset, and serves the final model via a Flask web application with a cutting-edge, responsive UI.

📸 Final UI Demo

| Light Mode (Form) | Dark Mode (Prediction Result) |
| :---: | :---: |
| ![AgriYield Predictor Light Mode UI](demo/Screenshot%20%28205%29.png) | ![AgriYield Predictor Dark Mode UI](demo/Screenshot%20%28207%29.png) |

✨ Core Features:

ML-Powered Predictions: Provides real-time crop yield forecasts using a trained Random Forest model.

Dynamic UI: A modern, 3-step wizard form to guide the user through data entry.

Immersive Design: Features a full-screen, looping video background with a semi-transparent "frosted glass" UI.

Responsive & Accessible: Built with Bootstrap, the UI is fully responsive and supports both Light and Dark modes.

Flask Backend: A lightweight, robust Python backend to handle prediction requests.

💻 Tech Stack:

Backend: Python, Flask

Machine Learning: Scikit-learn, Pandas, NumPy

Frontend: HTML, CSS (Bootstrap 5), JavaScript (ES6+)

Data Analysis: Jupyter Notebooks

📂 Project Structure:

An overview of the project directory.

AgriYield_Predictor/
├── 01_raw/             # Raw datasets (crop_yield.csv, Soil Data.csv)
├── 02_intermediate/    # Processed data (merged.csv, train/test splits)
├── 03_notebooks/       # Jupyter notebooks for each milestone
│   ├── 01_Data_Collection_and_Merging.ipynb
│   ├── 02_EDA_and_Feature_Engineering.ipynb
│   └── 03_Model_Training.ipynb
├── 04_reports/         # Output figures (heatmap, feature importance)
├── 05_models/          # Final trained model (final_model.pkl)
│   └── categorical_encodings.json
├── demo/               # Screenshot of images
├── static/
│   ├── css/style.css
│   ├── js/main.js
│   └── videos/Video_01.mp4
├── templates/
│   └── index.html
└── app.py              # The Flask application


🤖 Machine Learning Pipeline:

The project follows a complete, end-to-end data science workflow, documented in the 03_notebooks/ folder.

1. Data Collection & Cleaning

Source: Merged two disparate datasets: crop_yield.csv (state-level yield data) and Soil Data.csv (district-level soil metrics).

Cleaning: To resolve the different granularities, the soil data was aggregated from the district to the state level using its mean(). The two datasets were then merged into a single, clean file.

2. Feature Engineering & EDA

Feature Selection: 11 features were selected for modeling.

Data Leakage Prevention: Critically, Area and Production were removed, as they are used to calculate the target variable (Yield) and would cause data leakage.

Encoding: Categorical features (Crop, State, Season) were converted using LabelEncoder. The encoder mappings were then saved to 05_models/categorical_encodings.json so the production app.py could use them to transform live user input.

3. Model Training & Selection

Comparison: Three models were trained and evaluated: Linear Regression, XGBoost, and Random Forest.

Final Model: The Random Forest Regressor was selected as the final model, as it provided the best performance and generalization on the unseen test data.

Performance: The final model achieved an R-squared (R²) score of 0.98 on the test set.

Transparency: Feature importance analysis showed that Crop_encoded was the most significant predictor of yield.

4. Deployment

The final, trained final_model.pkl and the categorical_encodings.json are loaded by the Flask app.py script. The app serves an index.html template and provides a /predict API endpoint that validates, encodes, and processes user input in real-time.

How to Run Locally?:

Clone the repository:

git clone [https://github.com/PB-byte393/AgriYield_Predictor.git](https://github.com/PB-byte393/AgriYield_Predictor.git)
cd AgriYield_Predictor


Create and activate a virtual environment:

# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate


Install dependencies:
(Note: For a real project, you should create a requirements.txt file by running pip freeze > requirements.txt. For now, install these manually.)

pip install Flask pandas numpy scikit-learn xgboost joblib


Run the Flask application:

python app.py


Open in your browser:
Navigate to http://127.0.0.1:5000