import numpy as np
import joblib
import pandas as pd
import os
import math

# --- CORE METRIC CALCULATIONS ---
def calculate_net_ev(prizes_remaining, tickets_remaining, ticket_price):
    if tickets_remaining <= 0: return -ticket_price
    total_prize_value = sum(p['count'] * p['value'] for p in prizes_remaining)
    return (total_prize_value / tickets_remaining) - ticket_price

def calculate_volatility(prizes_remaining):
    prize_values = [p['value'] for p in prizes_remaining for _ in range(p['count'])]
    if not prize_values: return 0.0
    return float(np.std(prize_values))

def calculate_efficiency(net_ev, ticket_price):
    if ticket_price <= 0: return 0.0
    return net_ev / ticket_price

def calculate_capital_required(tickets_remaining, ticket_price):
    return tickets_remaining * ticket_price

# --- VIREO AI CORE - THE DEPLOYED MODEL ---
MODEL_PATH = "vireo_core_model.pkl"
VIREO_MODEL = None
if os.path.exists(MODEL_PATH):
    try:
        VIREO_MODEL = joblib.load(MODEL_PATH)
        print("Vireo AI Core (pre-trained model) loaded successfully.")
    except Exception as e:
        print(f"CRITICAL ERROR: Could not load AI model: {e}")
else:
    print("Warning: AI model file 'vireo_core_model.pkl' not found. Run train.py to create it.")

# --- EXPERT LOGIC (THE "TEACHER") ---
def get_expert_recommendation(metrics, user_bankroll):
    net_ev = metrics['net_ev']
    volatility = metrics['volatility']
    capital_required = metrics['capital_required']
    def score_net_ev(ev):
        if ev <= 0: return 0
        return min(10, math.log(1 + ev * 10, 1.5))
    def score_efficiency(eff):
        if eff <= 0: return 0
        return min(10, eff * 20)
    def score_bankroll_impact(cr, ub):
        if ub <= 0: return 0
        ratio = cr / ub
        if ratio > 1: return 0
        return (1 - ratio) * 10
    ev_score = score_net_ev(net_ev)
    efficiency_score = score_efficiency(metrics['efficiency'])
    bankroll_score = score_bankroll_impact(capital_required, user_bankroll)
    weights = {'ev': 0.5, 'efficiency': 0.3, 'bankroll': 0.2}
    vi_score = (ev_score * weights['ev'] + efficiency_score * weights['efficiency'] + bankroll_score * weights['bankroll']) * 10
    if vi_score >= 80: return "PRIME_OPPORTUNITY"
    elif vi_score >= 60: return "STRATEGIC_BUY"
    elif vi_score >= 40:
        if volatility > (net_ev + 1) * 20 and net_ev > 0: return "LOTTO_PLAY"
        else: return "LOW_RISK_GRIND"
    elif vi_score > 20: return "MONITOR"
    else: return "AVOID"

# --- MAIN ANALYSIS FUNCTION ---
def run_vireo_analysis(game_state, user_bankroll, mode='ai'):
    prizes_remaining = [p for p in game_state['prizes'] if p['count'] > 0]
    tickets_remaining = game_state['tickets_remaining']
    ticket_price = game_state['ticket_price']
    net_ev = calculate_net_ev(prizes_remaining, tickets_remaining, ticket_price)
    metrics = {
        'net_ev': net_ev,
        'volatility': calculate_volatility(prizes_remaining),
        'efficiency': calculate_efficiency(net_ev, ticket_price),
        'capital_required': calculate_capital_required(tickets_remaining, ticket_price)
    }
    if mode == 'expert':
        recommendation = get_expert_recommendation(metrics, user_bankroll)
        summary = f"Expert analysis determined this is a '{recommendation}' opportunity."
        return {'recommendation': recommendation, 'summary': summary, 'metrics': metrics}
    if not VIREO_MODEL:
        return {"error": "AI model is not loaded. Cannot perform analysis."}
    input_data = pd.DataFrame([{**metrics, 'user_bankroll': user_bankroll}])
    recommendation = VIREO_MODEL.predict(input_data)[0]
    summary = (f"Vireo AI Core analysis for '{game_state['game_name']}': "
               f"The model classifies this as a '{recommendation}' opportunity.")
    return {'recommendation': recommendation, 'summary': summary, 'metrics': metrics}
