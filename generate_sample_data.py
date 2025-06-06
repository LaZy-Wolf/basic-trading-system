import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

def generate_sample_data():
    start_date = datetime.now() - timedelta(days=500)
    dates = [start_date + timedelta(days=i) for i in range(500)]
    
    tickers = ["AAPL", "GOOGL", "MSFT", "TSLA"]
    data = {"date": [], "ticker": [], "close_price": []}
    
    for ticker in tickers:
        base_price = 150 if ticker == "AAPL" else 2800 if ticker == "GOOGL" else 380 if ticker == "MSFT" else 200
        prices = [max(50, base_price + np.random.normal(0, base_price * 0.1)) for _ in range(500)]
        data["date"].extend(dates)
        data["ticker"].extend([ticker] * 500)
        data["close_price"].extend(prices)
    
    df = pd.DataFrame(data)
    csv_path = os.path.join(os.path.dirname(__file__), "historical_prices.csv")
    df.to_csv(csv_path, index=False)
    print(f"Generated historical_prices.csv with {len(df)} rows at {csv_path}")
    return df

if __name__ == "__main__":
    generate_sample_data()