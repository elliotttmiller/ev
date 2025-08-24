import random
import pandas as pd
from vireo_engine import run_vireo_analysis

print("Starting synthetic data generation...")

def create_random_game_state():
    total_tickets = random.randint(500, 5000)
    ticket_price = float(random.choice([1, 2, 5]))
    prizes = []
    num_tiers = random.randint(3, 6)
    for i in range(num_tiers):
        value = ticket_price * random.choice([5, 10, 25, 50, 100, 250]) * (1 / (i + 1))
        count = random.randint(1, max(2, int(total_tickets / (500 * (i + 1)))))
        prizes.append({"count": int(count), "value": float(value)})
    tickets_sold = random.randint(0, int(total_tickets * 0.95))
    tickets_remaining = total_tickets - tickets_sold
    for prize in prizes:
        claim_probability = tickets_sold / total_tickets
        claimed_count = sum(1 for _ in range(prize['count']) if random.random() < claim_probability)
        prize['count'] -= claimed_count
    return {
        "game_name": "Synthetic Game",
        "ticket_price": ticket_price,
        "tickets_remaining": tickets_remaining,
        "prizes": prizes
    }

NUM_SAMPLES = 5000
all_data = []

for i in range(NUM_SAMPLES):
    if (i + 1) % 500 == 0:
        print(f"Generated {i+1}/{NUM_SAMPLES} samples...")
    game_state = create_random_game_state()
    user_bankroll = float(random.randint(100, 5000))
    try:
        analysis = run_vireo_analysis(game_state, user_bankroll, mode='expert')
        record = analysis['metrics']
        record['user_bankroll'] = user_bankroll
        record['recommendation'] = analysis['recommendation']
        all_data.append(record)
    except Exception:
        continue

df = pd.DataFrame(all_data)
df.to_csv("synthetic_training_data.csv", index=False)
print(f"\nSynthetic data generation complete. Saved {len(df)} records to 'synthetic_training_data.csv'.")
