"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

interface Alert {
  ticker: string
  price: number
  change_percent: number
}

export default function PriceAlerts() {
  const [status, setStatus] = useState("Disconnected")
  const [alerts, setAlerts] = useState<Alert[]>([])
  const { toast } = useToast()

  useEffect(() => {
    let ws: WebSocket | null = null

    const connect = () => {
      ws = new WebSocket("ws://localhost:8000/ws")
      
      ws.onopen = () => {
        console.log("WebSocket connected")
        setStatus("Connected")
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("Received data:", data)
          if (data.type === "batch" && data.alerts) {
            setAlerts((prev) => [...data.alerts, ...prev].slice(0, 10))
            data.alerts.forEach((alert: Alert) => {
              toast({
                title: `Price Alert: ${alert.ticker}`,
                description: `Price: $${alert.price}, Change: ${alert.change_percent}%`,
                variant: alert.change_percent > 0 ? "default" : "destructive",
              })
            })
          }
        } catch (e) {
          console.error("WebSocket message error:", e)
        }
      }

      ws.onclose = () => {
        console.log("WebSocket disconnected")
        setStatus("Disconnected")
        setTimeout(connect, 5000)
      }

      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        setStatus("Disconnected")
      }
    }

    connect()

    return () => {
      if (ws) ws.close()
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Price Alerts</span>
          <Badge variant={status === "Connected" ? "default" : "destructive"}>
            {status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-muted-foreground">No alerts received</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert, index) => (
              <li key={index} className="flex justify-between">
                <span>{alert.ticker}</span>
                <span>
                  ${alert.price} ({alert.change_percent}%)
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}