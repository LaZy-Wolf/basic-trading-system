"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"

interface AveragePrice {
  ticker: string
  avg_price: number
  period_start: string
  period_end: string
  trade_count: number
}

export default function AveragePrices() {
  const [averages, setAverages] = useState<AveragePrice[]>([])
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchAveragePrices = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/averages")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setAverages(data)
        setError(null)
      } catch (error) {
        console.error("Error fetching averages:", error)
        setError("Failed to load average prices. Please try again later.")
        toast({
          title: "Error",
          description: "Failed to load average prices.",
          variant: "destructive",
        })
      }
    }

    fetchAveragePrices()
    const interval = setInterval(fetchAveragePrices, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [toast])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>5-Minute Average Prices</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8 text-red-500">{error}</div>
        ) : averages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No average prices available</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticker</TableHead>
                <TableHead>Average Price</TableHead>
                <TableHead>Period Start</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead>Trade Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {averages.map((avg, index) => (
                <TableRow key={index}>
                  <TableCell>{avg.ticker}</TableCell>
                  <TableCell>{formatCurrency(avg.avg_price)}</TableCell>
                  <TableCell>{formatDateTime(avg.period_start)}</TableCell>
                  <TableCell>{formatDateTime(avg.period_end)}</TableCell>
                  <TableCell>{avg.trade_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}