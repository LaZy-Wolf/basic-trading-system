"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { Bell, BellOff, Wifi, WifiOff, Trash2 } from "lucide-react"

interface PriceAlert {
  id: string
  ticker: string
  price: number
  change_percent: number
  timestamp: string
  type: "increase" | "decrease"
}

export default function NotificationPanel() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false);


  useEffect(() => {
    if (!isEnabled) return

    const connectWebSocket = () => {
      try {
        console.log("Attempting WebSocket connection to ws://127.0.0.1:8000/ws")
        const ws = new WebSocket("ws://127.0.0.1:8000/ws")
        wsRef.current = ws

        ws.onopen = () => {
          console.log("WebSocket connected successfully")
          setIsConnected(true)
          toast({
            title: "Connected",
            description: "Real-time price alerts are now active",
          })
        }

        ws.onmessage = (event) => {
  if (isProcessing) return;
  
  setIsProcessing(true);
  try {
    const data = JSON.parse(event.data);
    
    if (data.type === "batch") {
      data.alerts.forEach((alert: any) => {
        const newAlert: PriceAlert = {
          id: Date.now().toString() + Math.random(),
          ticker: alert.ticker,
          price: alert.price,
          change_percent: alert.change_percent,
          timestamp: new Date().toISOString(),
          type: alert.change_percent > 0 ? "increase" : "decrease",
        };
        
        setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
        
        toast({
          title: `${alert.ticker} Price Alert`,
          description: `${alert.change_percent > 0 ? "📈" : "📉"} ${Math.abs(alert.change_percent).toFixed(2)}% change to $${alert.price.toFixed(2)}`,
          variant: alert.change_percent > 0 ? "default" : "destructive",
        });
      });
    }
  } catch (error) {
    console.error("Error parsing message:", error);
  } finally {
    setTimeout(() => setIsProcessing(false), 1000); // Throttle to 1 message/sec
  }
};

        ws.onclose = (event) => {
          console.log("WebSocket closed:", event.code, event.reason)
          setIsConnected(false)
          attemptReconnect()
        }

        ws.onerror = (error) => {
          console.error("WebSocket error:", error)
          setIsConnected(false)
        }
      } catch (error) {
        console.error("WebSocket connection failed:", error)
        setIsConnected(false)
        attemptReconnect()
      }
    }

    const attemptReconnect = () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
      reconnectTimeout.current = setTimeout(() => {
        if (isEnabled) connectWebSocket()
      }, 3000)
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        console.log("Closing WebSocket")
        wsRef.current.close()
        wsRef.current = null
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
      }
    }
  }, [isEnabled, toast])

  const toggleNotifications = () => {
    setIsEnabled(!isEnabled)
    if (isEnabled && wsRef.current) {
      wsRef.current.close()
    }
  }

  const clearAlerts = () => {
    setAlerts([])
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Price Alerts</span>
            <div className="flex items-center space-x-1">
              {isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={clearAlerts} disabled={alerts.length === 0}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button variant={isEnabled ? "default" : "outline"} size="sm" onClick={toggleNotifications}>
              {isEnabled ? <Bell className="h-4 w-4 mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
              {isEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Real-time notifications for 2%+ price changes within a minute ({alerts.length} alerts)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isEnabled
                ? isConnected
                  ? "No price alerts yet. Monitoring for 2%+ changes..."
                  : "Connecting to price alert service..."
                : "Price alerts are disabled"}
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{alert.type === "increase" ? "📈" : "📉"}</div>
                    <div>
                      <div className="font-medium">{alert.ticker}</div>
                      <div className="text-sm text-muted-foreground">{formatTime(alert.timestamp)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(alert.price)}</div>
                    <Badge variant={alert.type === "increase" ? "default" : "destructive"} className="text-xs">
                      {alert.change_percent > 0 ? "+" : ""}
                      {alert.change_percent.toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}