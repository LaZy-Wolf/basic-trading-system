import os
import logging
from celery import Celery
from sqlalchemy import create_engine, func, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Redis Configuration
REDIS_HOST = 'localhost'
REDIS_PORT = 6379
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', '')

app = Celery(
    'tasks',
    broker=f'redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/0',
    backend=f'redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/0'
)

app.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='UTC',
    enable_utc=True,
    broker_connection_retry_on_startup=True,
    broker_connection_max_retries=100,
    broker_pool_limit=None,
    result_backend_transport_options={
        'retry_policy': {
            'timeout': 5.0,
            'interval_start': 0,
            'interval_step': 0.2,
            'interval_max': 0.5,
        }
    }
)

# Database setup
DATABASE_URL = "postgresql+psycopg2://postgres:Lonewolf252436@localhost:5432/trading_system"
try:
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.debug("Database connection established")
except Exception as e:
    logger.error(f"Database connection failed: {e}")
    raise

# Import TradeDB model
from main import TradeDB

@app.task(name='calculate_averages')
def calculate_averages():
    logger.debug("Starting calculate_averages task")
    db = SessionLocal()
    try:
        # Debug: Check all trades
        all_trades = db.query(TradeDB).all()
        logger.debug(f"Found {len(all_trades)} total trades: {[t.__dict__ for t in all_trades]}")
        
        # Use latest trade timestamp for window
        latest_trade = db.query(TradeDB).order_by(TradeDB.timestamp.desc()).first()
        if not latest_trade:
            logger.debug("No trades found, using fallback")
            fallback = {
                "ticker": "AAPL",
                "avg_price": 0,
                "period_start": "",
                "period_end": "",
                "trade_count": 0
            }
            return fallback
            
        end_time = latest_trade.timestamp
        start_time = end_time - timedelta(minutes=5)
        logger.debug(f"Querying trades from {start_time} to {end_time}")
        
        # Raw SQL query
        query = text("""
            SELECT ticker, AVG(price) as avg_price, COUNT(*) as trade_count
            FROM trades
            WHERE timestamp >= :start_time AND timestamp <= :end_time
            GROUP BY ticker
        """)
        result = db.execute(query, {"start_time": start_time, "end_time": end_time}).fetchone()
        logger.debug(f"SQL query result: {result}")
        
        if result:
            logger.debug(f"Processing result: ticker={result[0]}, avg_price={result[1]}, trade_count={result[2]}")
            avg = {
                "ticker": result[0],
                "avg_price": float(result[1]),
                "period_start": start_time.isoformat(),
                "period_end": end_time.isoformat(),
                "trade_count": int(result[2])
            }
            # Debug: Check table before insert
            check_query = text("SELECT * FROM averages WHERE ticker = :ticker AND period_start = :period_start")
            existing = db.execute(check_query, {"ticker": avg["ticker"], "period_start": avg["period_start"]}).fetchone()
            logger.debug(f"Existing record: {existing}")
            
            db.execute(
                text("""
                    INSERT INTO averages (ticker, avg_price, period_start, period_end, trade_count)
                    VALUES (:ticker, :avg_price, :period_start, :period_end, :trade_count)
                    ON CONFLICT (ticker, period_start, period_end) DO NOTHING
                """),
                {
                    "ticker": avg["ticker"],
                    "avg_price": avg["avg_price"],
                    "period_start": avg["period_start"],
                    "period_end": avg["period_end"],
                    "trade_count": avg["trade_count"]
                }
            )
            db.commit()
            logger.debug(f"Insert attempted for average: {avg}")
            # Verify insert
            verify_query = text("SELECT * FROM averages WHERE ticker = :ticker AND period_start = :period_start")
            inserted = db.execute(verify_query, {"ticker": avg["ticker"], "period_start": avg["period_start"]}).fetchone()
            logger.debug(f"Verified insert: {inserted}")
            return avg
        else:
            logger.debug("No trades in window, storing fallback")
            fallback = {
                "ticker": "AAPL",
                "avg_price": 0,
                "period_start": start_time.isoformat(),
                "period_end": end_time.isoformat(),
                "trade_count": 0
            }
            db.execute(
                text("""
                    INSERT INTO averages (ticker, avg_price, period_start, period_end, trade_count)
                    VALUES (:ticker, :avg_price, :period_start, :period_end, :trade_count)
                    ON CONFLICT (ticker, period_start, period_end) DO NOTHING
                """),
                {
                    "ticker": fallback["ticker"],
                    "avg_price": fallback["avg_price"],
                    "period_start": fallback["period_start"],
                    "period_end": fallback["period_end"],
                    "trade_count": fallback["trade_count"]
                }
            )
            db.commit()
            logger.debug(f"Insert attempted for fallback: {fallback}")
            verify_query = text("SELECT * FROM averages WHERE ticker = :ticker AND period_start = :period_start")
            inserted = db.execute(verify_query, {"ticker": fallback["ticker"], "period_start": fallback["period_start"]}).fetchone()
            logger.debug(f"Verified insert: {inserted}")
            return fallback
    except Exception as e:
        logger.error(f"Error in calculate_averages: {e}")
        db.rollback()
        raise
    finally:
        db.close()
        logger.debug("Database session closed")

logger.debug(f"Celery configured with Redis at {REDIS_HOST}:{REDIS_PORT}")