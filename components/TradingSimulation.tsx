"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Signal {
  date: string
  ticker: string
  action: string
  price: number
}

interface AnalysisResult {
  date: string
  total_volume: number
  average_price: number
  trade_count: number
  top_tickers: { ticker: string; volume: number; avg_price: number; trade_count: number }[]
}

export default function TradingSimulation() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [profitLoss, setProfitLoss] = useState(0)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [date, setDate] = useState("2025-06-05")

  const runSimulation = async () => {
    try {
      const response = await fetch("http://localhost:8000/simulate", { method: "POST" })
      const data = await response.json()
      setSignals(data.signals)
      setProfitLoss(data.profit_loss)
    } catch (error) {
      console.error("Simulation error:", error)
    }
  }

  const runAnalysis = async () => {
    try {
      const response = await fetch("http://localhost:8000/analyze/aws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date })
      })
      const data = await response.json()
      setAnalysis(data)
    } catch (error) {
      console.error("AWS Analysis error:", error)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AWS Lambda Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Analysis Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>
            <Button onClick={runAnalysis}>Run Analysis</Button>
            {analysis && (
              <div className="mt-4">
                <h3>Analysis Results for {analysis.date}</h3>
                <p>Total Volume: {analysis.total_volume}</p>
                <p>Avg Price: ${analysis.average_price.toFixed(2)}</p>
                <p>{analysis.trade_count} trades</p>
                <h4>Top Tickers by Volume</h4>
                <ul>
                  {analysis.top_tickers.map((ticker, index) => (
                    <li key={index}>
                      #{index + 1} {ticker.ticker} {ticker.volume} vol ${ticker.avg_price.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Trading Simulation</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runSimulation}>Run Simulation</Button>
          {signals.length > 0 && (
            <div className="mt-4">
              <p>Total Profit/Loss: ${profitLoss.toFixed(2)}</p>
              <p>{signals.length} signals</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Ticker</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signals.map((signal, index) => (
                    <TableRow key={index}>
                      <TableCell>{signal.date}</TableCell>
                      <TableCell>{signal.ticker}</TableCell>
                      <TableCell>{signal.action}</TableCell>
                      <TableCell>${signal.price.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}