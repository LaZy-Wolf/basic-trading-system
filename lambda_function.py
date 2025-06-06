import json
import pandas as pd
import boto3
from datetime import datetime
import logging
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

AWS_REGION = "ap-south-1"  # Hardcoded to avoid env var issues
S3_BUCKET = "trading-system-trades-1234"
s3_client = boto3.client("s3", region_name=AWS_REGION)

def get_trades_from_s3(date: str) -> pd.DataFrame:
    try:
        analysis_date = datetime.strptime(date, "%Y-%m-%d")
        s3_key = f"{analysis_date.strftime('%Y/%m/%d')}/trades.csv"
        logger.info(f"Fetching trades from s3://{S3_BUCKET}/{s3_key}")
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=s3_key)
        df = pd.read_csv(response['Body'])
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        logger.info(f"Found {len(df)} trades for {date}")
        return df
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            logger.info(f"No trades found for {date}")
            return pd.DataFrame()
        logger.error(f"S3 access error: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Error reading trades CSV: {str(e)}")
        raise

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

def save_analysis_results(date: str, analysis: dict) -> bool:
    try:
        analysis_date = datetime.strptime(date, "%Y-%m-%d")
        s3_key = f"{analysis_date.strftime('%Y/%m/%d')}/analysis_{date}.csv"
        analysis_df = pd.DataFrame(analysis['top_tickers'])
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=analysis_df.to_csv(index=False),
            ContentType='text/csv'
        )
        logger.info(f"Analysis saved to s3://{S3_BUCKET}/{s3_key}")
        return True
    except Exception as e:
        logger.error(f"Failed to save analysis: {str(e)}")
        return False

def lambda_handler(event, context):
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        date = event.get("queryStringParameters", {}).get("date") or datetime.utcnow().strftime("%Y-%m-%d")
        
        try:
            datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Invalid date format. Use YYYY-MM-DD"}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "http://localhost:3000",
                    "Access-Control-Allow-Methods": "POST,OPTIONS",
                    "Access-Control-Allow-Headers": "*"
                }
            }
        
        trades_df = get_trades_from_s3(date)
        analysis_result = analyze_trades(trades_df, date)
        save_analysis_results(date, analysis_result)
        
        return {
            "statusCode": 200,
            "body": json.dumps(analysis_result),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "http://localhost:3000",
                "Access-Control-Allow-Methods": "POST,OPTIONS",
                "Access-Control-Allow-Headers": "*"
            }
        }
    except Exception as e:
        logger.error(f"Error in lambda_handler: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "http://localhost:3000",
                "Access-Control-Allow-Methods": "POST,OPTIONS",
                "Access-Control-Allow-Headers": "*"
            }
        }