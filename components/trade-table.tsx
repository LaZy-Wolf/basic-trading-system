"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Search, RefreshCw, Filter } from "lucide-react"

interface Trade {
  id: number
  ticker: string
  price: number
  quantity: number
  trade_type: "buy" | "sell"
  timestamp: string
}

interface TradeTableProps {
  refreshTrigger: number
}

export default function TradeTable({ refreshTrigger }: TradeTableProps) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    ticker: "",
    startDate: "",
    endDate: "",
  })
  const { toast } = useToast()

  // Fetch trades from API
  const fetchTrades = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("http://localhost:8000/trades")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setTrades(data)
      setFilteredTrades(data)
    } catch (error) {
      console.error("Error fetching trades:", error)
      toast({
        title: "Error",
        description: "Failed to fetch trades. Please check your connection.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load and refresh when refreshTrigger changes
  useEffect(() => {
    fetchTrades()
  }, [refreshTrigger])

  // Apply filters when trades or filters change
  useEffect(() => {
    let filtered = trades

    // Filter by ticker
    if (filters.ticker) {
      filtered = filtered.filter((trade) => trade.ticker.toLowerCase().includes(filters.ticker.toLowerCase()))
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter((trade) => new Date(trade.timestamp) >= new Date(filters.startDate))
    }

    if (filters.endDate) {
      filtered = filtered.filter((trade) => new Date(trade.timestamp) <= new Date(filters.endDate + "T23:59:59"))
    }

    setFilteredTrades(filtered)
  }, [trades, filters])

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const clearFilters = () => {
    setFilters({
      ticker: "",
      startDate: "",
      endDate: "",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Trade History</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchTrades} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          View and filter your trading history ({filteredTrades.length} of {trades.length} trades)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-6 p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="h-4 w-4" />
            <Label className="text-sm font-medium">Filters</Label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticker-filter">Ticker</Label>
              <Input
                id="ticker-filter"
                placeholder="e.g., AAPL"
                value={filters.ticker}
                onChange={(e) => handleFilterChange("ticker", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading trades...
                    </TableCell>
                  </TableRow>
                ) : filteredTrades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {trades.length === 0 ? "No trades found" : "No trades match your filters"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTrades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell className="font-medium">{trade.ticker}</TableCell>
                      <TableCell>
                        <Badge variant={trade.trade_type === "buy" ? "default" : "secondary"}>
                          {trade.trade_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(trade.price)}</TableCell>
                      <TableCell className="text-right">{trade.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(trade.price * trade.quantity)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(trade.timestamp)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
