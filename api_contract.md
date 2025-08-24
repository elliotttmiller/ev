
## 1. /estimate_tickets
- Method: POST
- Request: { image: (box image), fill_ratio: float, total_tickets: int }
- Response: { estimated_tickets: int }

## 2. /ocr_prize_board
- Method: POST
- Request: { image: (prize board image) }
- Response: { prizes: [ { count: int, value: float } ] }

## 3. /run_analysis
- Method: POST
- Request: { game_name: str, ticket_price: float, tickets_remaining: int, prizes: [ { count: int, value: float, claimed: bool } ] }
- Response: { net_ev: float, volatility: float, efficiency: float, capital_required: float, recommendation: str, summary: str }
