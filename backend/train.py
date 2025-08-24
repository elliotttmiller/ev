import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import classification_report
import joblib

print("Starting Vireo AI Core training on synthetic data...")
try:
    df = pd.read_csv("synthetic_training_data.csv")
except FileNotFoundError:
    print("Error: 'synthetic_training_data.csv' not found. Please run 'generate_synthetic_data.py' first.")
    exit()

print(f"Loaded {len(df)} records from the synthetic dataset.")
features = ['net_ev', 'volatility', 'efficiency', 'capital_required', 'user_bankroll']
target = 'recommendation'
X = df[features]
y = df[target]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print("Training the GradientBoostingClassifier...")
model = GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=3, random_state=42)
model.fit(X_train, y_train)

print("\n--- Model Evaluation ---")
predictions = model.predict(X_test)
print(classification_report(y_test, predictions))

model_filename = "vireo_core_model.pkl"
joblib.dump(model, model_filename)
print(f"\nTraining complete. Your 'pre-trained' model is saved as '{model_filename}'.")
