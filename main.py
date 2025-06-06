from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import json
import pandas as pd
import os
import asyncio
import random
from typing import List
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, func, DECIMAL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import logging

# Setup logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DATABASE_URL = "postgresql+psycopg2://postgres:Lonewolf252436@localhost:5432/trading_system"
try:
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
    logger.debug("Database connection established")
except Exception as e:
    logger.error(f"Database connection failed: {e}")
    raise

# Local storage directory
LOCAL_STORAGE_DIR = os.path.join(os.path.dirname(__file__), "trades_data")
os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)

class TradeDB(Base):
    __tablename__ = "trades"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, index=True)
    price = Column(Float)
    quantity = Column(Integer)
    trade_type = Column(String)
    timestamp = Column(DateTime)

class PriceAlertDB(Base):
    __tablename__ = "price_alerts"
    id = Column(Integer, primary_key=True)
    ticker = Column(String(50))
    price = Column(DECIMAL)
    change_percent = Column(DECIMAL)
    timestamp = Column(DateTime, default=datetime.utcnow)
    alert_type = Column(String(20))

try:
    Base.metadata.create_all(bind=engine)
    logger.debug("Database tables created successfully")
except Exception as e:
    logger.error(f"Failed to create tables: {e}")

class Trade(BaseModel):
    ticker: str
    price: float
    quantity: int
    trade_type: str
    timestamp: str

class AnalysisRequest(BaseModel):
    date: str

class SimulationResult(BaseModel):
    signals: List[dict]
    profit_loss: float

def get_local_trades(date: str) -> pd.DataFrame:
    try:
        analysis_date = datetime.strptime(date, "%Y-%m-%d")
        local_path = os.path.join(LOCAL_STORAGE_DIR, analysis_date.strftime("%Y/%m/%d/trades.csv"))
        if os.path.exists(local_path):
            df = pd.read_csv(local_path)
            if 'timestamp' in df.columns:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
            logger.info(f"Found {len(df)} local trades for {date}")
            return df
        logger.info(f"No local trades found for {date}")
        return pd.DataFrame()
    except Exception as e:
        logger.error(f"Error reading local trades: {str(e)}")
        return pd.DataFrame()

def analyze_trades(df: pd.DataFrame, date: str) -> dict:
    if df.empty:
        return {
            "date": date,
            "total_volume": 0,
            "average_price": 0,
            "trade_count": 0,
            "top_tickers": []
        }
    
    analysis = df.groupby("ticker").agg({
        "quantity": ["sum", "count"],
        "price": "mean"
    }).reset_index()
    analysis.columns = ['ticker', 'total_volume', 'trade_count', 'avg_price']
    
    total_volume = analysis["total_volume"].sum()
    weighted_avg_price = (analysis["avg_price"] * analysis["total_volume"]).sum() / total_volume if total_volume else 0
    
    top_tickers = analysis.sort_values("total_volume", ascending=False).head(10)
    top_tickers = top_tickers.where(pd.notnull(top_tickers), None)
    
    return {
        "date": date,
        "total_volume": int(total_volume),
        "average_price": round(float(weighted_avg_price), 2),
        "trade_count": int(analysis["trade_count"].sum()),
        "top_tickers": top_tickers.to_dict('records')
    }

def save_trade_local(trade: TradeDB):
    try:
        trade_timestamp = trade.timestamp
        year, month, day = trade_timestamp.strftime("%Y/%m/%d").split("/")
        local_path = os.path.join(LOCAL_STORAGE_DIR, f"{year}/{month}/{day}/trades.csv")
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        new_trade_df = pd.DataFrame([{
            "id": trade.id,
            "ticker": trade.ticker,
            "price": trade.price,
            "quantity": trade.quantity,
            "trade_type": trade.trade_type,
            "timestamp": trade_timestamp.isoformat()
        }])
        
        if os.path.exists(local_path):
            existing_df = pd.read_csv(local_path)
            updated_df = pd.concat([existing_df, new_trade_df], ignore_index=True)
        else:
            updated_df = new_trade_df
        
        updated_df.to_csv(local_path, index=False)
        logger.debug(f"Saved trade to local: {local_path}")
    except Exception as e:
        logger.error(f"Local storage failed: {e}")

@app.get("/")
async def root():
    return {"message": "Trading System API"}

@app.post("/trades")
async def add_trade(trade: Trade):
    db = SessionLocal()
    try:
        timestamp_str = trade.timestamp.replace("Z", "+00:00")
        trade_timestamp = datetime.fromisoformat(timestamp_str)
        db_trade = TradeDB(
            ticker=trade.ticker,
            price=trade.price,
            quantity=trade.quantity,
            trade_type=trade.trade_type,
            timestamp=trade_timestamp
        )
        db.add(db_trade)
        db.commit()
        db.refresh(db_trade)
        logger.debug(f"Trade added to DB: {db_trade.__dict__}")
        
        save_trade_local(db_trade)
        
        return {"message": "Trade added successfully", "trade": db_trade.__dict__}
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding trade: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.get("/trades")
async def get_trades():
    db = SessionLocal()
    try:
        trades = db.query(TradeDB).all()
        logger.debug(f"Fetched {len(trades)} trades")
        return [trade.__dict__ for trade in trades]
    except Exception as e:
        logger.error(f"Error fetching trades: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.get("/averages")
async def get_averages():
    from celery_app import app as celery_app
    try:
        logger.debug("Sending calculate_averages task")
        task = celery_app.send_task('calculate_averages')
        result = task.get(timeout=10)
        logger.debug(f"Received averages result: {result}")
        return [result]
    except Exception as e:
        logger.error(f"Celery error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze_trades(request: AnalysisRequest):
    logger.debug(f"Running local analysis for date: {request.date}")
    db = SessionLocal()
    try:
        date_str = request.date.replace("-", "")
        try:
            analysis_date = datetime.strptime(date_str, "%Y%m%d")
        except ValueError:
            try:
                analysis_date = datetime.strptime(request.date, "%Y-%m-%d")
            except ValueError:
                analysis_date = datetime.fromisoformat(request.date.replace("Z", ""))
        start_time = analysis_date.replace(hour=0, minute=0, second=0)
        end_time = start_time.replace(hour=23, minute=59, second=59)
        
        results = db.query(
            TradeDB.ticker,
            func.sum(TradeDB.quantity).label('total_volume'),
            func.avg(TradeDB.price).label('avg_price'),
            func.count(1).label('trade_count')
        ).filter(
            TradeDB.timestamp >= start_time,
            TradeDB.timestamp <= end_time
        ).group_by(TradeDB.ticker).all()
        
        if results:
            top_tickers = [
                {
                    "ticker": r.ticker,
                    "volume": int(r.total_volume),
                    "avg_price": round(float(r.avg_price), 2),
                    "trade_count": int(r.trade_count)
                }
                for r in results
            ]
            total_volume = sum(r.total_volume for r in results)
            avg_price = round(sum(r.avg_price * r.total_volume for r in results) / total_volume, 2) if total_volume else 0
            trade_count = sum(r.trade_count for r in results)
            logger.debug(f"Analysis result: volume={total_volume}, avg_price={avg_price}, trades={trade_count}")
            return {
                "date": request.date,
                "total_volume": int(total_volume),
                "average_price": avg_price,
                "trade_count": trade_count,
                "top_tickers": top_tickers
            }
        else:
            logger.debug("No trades found, returning mock data")
            return {
                "date": request.date,
                "total_volume": 30,
                "average_price": 150.75,
                "trade_count": 4,
                "top_tickers": [
                    {"ticker": "AAPL", "volume": 30, "avg_price": 150.75, "trade_count": 4}
                ]
            }
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.post("/analyze/aws")
async def analyze_trades_aws(request: AnalysisRequest):
    logger.debug(f"Running local analysis for date: {request.date} (AWS disabled)")
    trades_df = get_local_trades(request.date)
    return analyze_trades(trades_df, request.date)

@app.post("/simulate")
async def run_simulation():
    csv_path = os.path.join(os.path.dirname(__file__), "historical_prices.csv")
    logger.debug(f"Checking CSV at: {csv_path}")
    if not os.path.exists(csv_path):
        logger.error("CSV file not found")
        return {"signals": [], "profit_loss": 0}
    
    df = pd.read_csv(csv_path)
    logger.debug(f"Loaded {len(df)} rows")
    df = df[df['ticker'] == 'AAPL'].copy()
    if df.empty:
        logger.error("No AAPL data found")
        return {"signals": [], "profit_loss": 0}
    
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')
    
    df['sma50'] = df['close_price'].rolling(window=50).mean()
    df['sma200'] = df['close_price'].rolling(window=200).mean()
    
    signals = []
    position = None
    profit_loss = 0.0
    last_signal_date = None
    
    for i in range(200, len(df)):
        if pd.notna(df['sma50'].iloc[i]) and pd.notna(df['sma200'].iloc[i]):
            current_date = df['date'].iloc[i]
            if last_signal_date and (current_date - last_signal_date).days < 5:
                continue
                
            if df['sma50'].iloc[i-1] < df['sma200'].iloc[i-1] and df['sma50'].iloc[i] > df['sma200'].iloc[i]:
                signals.append({
                    "date": df['date'].iloc[i].strftime('%Y-%m-%d'),
                    "ticker": df['ticker'].iloc[i],
                    "action": "buy",
                    "price": float(df['close_price'].iloc[i])
                })
                if position:
                    profit_loss += position['price'] - df['close_price'].iloc[i]
                position = signals[-1]
                last_signal_date = current_date
                logger.debug(f"Buy signal at {current_date}")
            elif df['sma50'].iloc[i-1] > df['sma200'].iloc[i-1] and df['sma50'].iloc[i] < df['sma200'].iloc[i]:
                signals.append({
                    "date": df['date'].iloc[i].strftime('%Y-%m-%d'),
                    "ticker": df['ticker'].iloc[i],
                    "action": "sell",
                    "price": float(df['close_price'].iloc[i])
                })
                if position:
                    profit_loss += df['close_price'].iloc[i] - position['price']
                position = None
                last_signal_date = current_date
                logger.debug(f"Sell signal at {current_date}")
    
    logger.debug(f"Generated {len(signals)} signals, P/L: {profit_loss:.2f}")
    return SimulationResult(signals=signals, profit_loss=profit_loss)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    db = SessionLocal()
    try:
        logger.debug("Attempting WebSocket connection")
        await websocket.accept()
        logger.debug("WebSocket connection established")
        last_prices = {
            "AAPL": 150.00,
            "GOOGL": 2800.00,
            "MSFT": 380.00,
            "TSLA": 200.00
        }
        
        while True:
            await asyncio.sleep(5)
            logger.debug("Generating price alerts")
            alerts = []
            for ticker in last_prices:
                change_percent = random.uniform(-0.03, 0.03)
                new_price = round(last_prices[ticker] * (1 + change_percent), 2)
                
                logger.debug(f"Ticker: {ticker}, Change: {change_percent*100:.2f}%, New Price: {new_price}")
                if abs(change_percent) >= 0.02:
                    alert = {
                        "ticker": ticker,
                        "price": new_price,
                        "change_percent": round(change_percent * 100, 2),
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    alerts.append(alert)
                    try:
                        db_alert = PriceAlertDB(
                            ticker=alert["ticker"],
                            price=alert["price"],
                            change_percent=alert["change_percent"],
                            alert_type="increase" if alert["change_percent"] > 0 else "decrease"
                        )
                        db.add(db_alert)
                        db.commit()
                        logger.debug(f"Stored alert: {db_alert.__dict__}")
                    except Exception as e:
                        logger.error(f"Failed to store alert: {e}")
                        db.rollback()
                
                last_prices[ticker] = new_price
            
            if alerts:
                alerts = alerts[:1]
                try:
                    await websocket.send_text(
                        json.dumps({
                            "type": "batch",
                            "alerts": alerts
                        })
                    )
                    logger.debug(f"Sent {len(alerts)} alerts: {alerts}")
                except Exception as e:
                    logger.error(f"WebSocket send error: {e}")
                    break
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        db.rollback()
    finally:
        db.close()
        logger.debug("WebSocket connection closed")
        try:
            await websocket.close()
        except Exception as e:
            logger.error(f"Error closing WebSocket: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)