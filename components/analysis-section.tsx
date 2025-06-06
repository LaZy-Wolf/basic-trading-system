"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { BarChart3, Loader2, TrendingUp, DollarSign } from "lucide-react"

interface AnalysisResult {
  date: string
  total_volume: number
  average_price: number
  trade_count: number
  top_tickers: Array<{
    ticker: string
    volume: number
    avg_price: number
  }>
}

export default function AnalysisSection() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0], // Today's date
  )
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const { toast } = useToast()

  const triggerAnalysis = async () => {
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date for analysis",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)
    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date: selectedDate }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setAnalysisResult(result)

      toast({
        title: "Analysis Complete",
        description: `AWS Lambda analysis completed for ${selectedDate}`,
      })
    } catch (error) {
      console.error("Error triggering analysis:", error)
      toast({
        title: "Analysis Failed",
        description: "Failed to complete analysis. Please check your connection and try again.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>AWS Lambda Analysis</span>
        </CardTitle>
        <CardDescription>Trigger advanced trading analysis using AWS Lambda</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Selection and Trigger */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="analysis-date">Analysis Date</Label>
            <Input
              id="analysis-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>

          <Button onClick={triggerAnalysis} disabled={isAnalyzing || !selectedDate} className="w-full">
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Analysis...
              </>
            ) : (
              <>
                <BarChart3 className="mr-2 h-4 w-4" />
                Run Analysis
              </>
            )}
          </Button>
        </div>

        {/* Analysis Results */}
        {analysisResult && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-semibold text-sm text-muted-foreground">
              Analysis Results for {new Date(analysisResult.date).toLocaleDateString()}
            </h4>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg bg-muted/50">
                <div className="flex items-center space-x-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Total Volume</span>
                </div>
                <div className="text-lg font-bold">{formatNumber(analysisResult.total_volume)}</div>
                <Badge variant="outline" className="text-xs mt-1">
                  {analysisResult.trade_count} trades
                </Badge>
              </div>

              <div className="p-3 border rounded-lg bg-muted/50">
                <div className="flex items-center space-x-2 mb-1">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Avg Price</span>
                </div>
                <div className="text-lg font-bold">{formatCurrency(analysisResult.average_price)}</div>
              </div>
            </div>

            {/* Top Tickers */}
            {analysisResult.top_tickers && analysisResult.top_tickers.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-medium text-sm">Top Tickers by Volume</h5>
                <div className="space-y-2">
                  {analysisResult.top_tickers.slice(0, 3).map((ticker, index) => (
                    <div
                      key={ticker.ticker}
                      className="flex items-center justify-between p-2 border rounded bg-muted/30"
                    >
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        <span className="font-medium">{ticker.ticker}</span>
                      </div>
                      <div className="text-right text-sm">
                        <div>{formatNumber(ticker.volume)} vol</div>
                        <div className="text-muted-foreground">{formatCurrency(ticker.avg_price)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
