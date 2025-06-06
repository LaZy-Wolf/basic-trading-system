Basic Trading System
This project implements a trading system with a REST API, WebSocket for price alerts, trade analysis, and simulation capabilities, built as part of an internship assignment. The backend uses FastAPI, PostgreSQL, Celery, and local CSV storage, with a React frontend for user interaction.
Table of Contents

Features
Prerequisites
Setup Instructions
Running the Application
API Endpoints
Assumptions
Screenshots
Project Structure
Future Improvements

Features

Task 1: REST API
Add trades (POST /trades).
Retrieve trades (GET /trades).
Analyze trades by date (POST /analyze).
Compute averages using Celery (GET /averages).


Task 2: WebSocket
Real-time price alerts for tickers (AAPL, GOOGL, MSFT, TSLA) via /ws.


Task 4: Simulation
Generate buy/sell signals based on SMA crossover (POST /simulate).


Local Storage: Trades are stored in CSV files (trades_data/YYYY/MM/DD/trades.csv) and PostgreSQL.
Frontend: React UI for trade submission and analysis visualization.

Note: AWS Lambda integration (Task 3) is not included in this submission due to ongoing dependency issues but is available in lambda_function.py for reference.
Prerequisites

Python: 3.9
Node.js: 18.x or later
PostgreSQL: 13 or later
Redis: For Celery task queue
Git: For cloning the repository
Operating System: Tested on Windows 10/11

Setup Instructions

Clone the Repository
git clone https://github.com/LaZy-Wolf/basic-trading-system.git
cd basic-trading-system


Set Up Python Environment
python -m venv .venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt


Install PostgreSQL

Download and install PostgreSQL.
Create a database:psql -U postgres
CREATE DATABASE trading_system;
\q


Update main.py if your PostgreSQL credentials differ (default: postgres:Lonewolf252436@localhost:5432/trading_system).


Install Redis

Download Redis for Windows.
Extract and start Redis:redis-server




Set Up Frontend
cd frontend
npm install


Prepare Data

Place historical_prices.csv in the project root for /simulate (format: ticker,date,close_price).
Example:ticker,date,close_price
AAPL,2024-01-01,150.00





Running the Application

Start Redis
redis-server


Start Celery Worker
.\venv\Scripts\activate
celery -A celery_app worker --loglevel=info --pool=solo


Start FastAPI Server
python main.py


Start Frontend
cd frontend
npm run dev


Open http://localhost:3000 in your browser.



API Endpoints

POST /trades
Add a trade.
Request: {"ticker":"AAPL","price":152.00,"quantity":5,"trade_type":"buy","timestamp":"2025-06-05T20:32:00Z"}
Response: {"message":"Trade added successfully","trade":{...}}


GET /trades
Retrieve all trades.
Response: [{id:1,ticker:"AAPL",...},...]


POST /analyze
Analyze trades by date.
Request: {"date":"2025-06-05"}
Response: {"date":"2025-06-05","total_volume":30,"average_price":150.75,...}


POST /analyze/aws
Currently uses local analysis (AWS disabled).


GET /averages
Compute trade averages via Celery.
Response: [{"average_price":150.75,"total_volume":30}]


POST /simulate
Run trading simulation.
Response: {"signals":[{"date":"2025-01-01","ticker":"AAPL","action":"buy","price":150.00},...],"profit_loss":100.50}


WebSocket /ws
Receive price alerts (e.g., {"type":"batch","alerts":[{"ticker":"AAPL","price":152.00,...}]}).



Assumptions

Data Storage: Trades are stored in both PostgreSQL and local CSV files.
Timestamp Format: ISO 8601 with Z (UTC).
Historical Data: historical_prices.csv is provided or generated.
Tickers: Limited to AAPL, GOOGL, MSFT, TSLA for WebSocket alerts.
AWS: Disabled due to numpy/pandas incompatibility; local analysis used instead.
Frontend: Assumes React UI is in frontend/ (not included in this submission if not required).

Screenshots
Below is a screenshot of the React UI showing trade submission and analysis results:
Project Structure
basic-trading-system/
├── main.py              # FastAPI server (REST API, WebSocket, simulation)
├── celery_app.py        # Celery tasks for averages
├── requirements.txt     # Python dependencies
├── README.md            # Project documentation
├── screenshots/         # Screenshots
│   └── trade_screenshot.png
├── lambda_function.py   # AWS Lambda (optional, not active)
├── trades_data/         # Local CSV storage (excluded from Git)
├── historical_prices.csv # Simulation data (excluded)
├── frontend/            # React UI (optional, excluded)

Future Improvements

Re-enable AWS Lambda integration (Task 3) after resolving dependency issues.
Add input validation for tickers in trade-form.tsx.
Implement authentication for API endpoints.
Enhance simulation with additional strategies.
Add unit tests for API and Celery tasks.

