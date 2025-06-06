"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

interface TradeFormProps {
  onTradeAdded: () => void
}

export default function TradeForm({ onTradeAdded }: TradeFormProps) {
  const [ticker, setTicker] = useState("")
  const [price, setPrice] = useState("")
  const [volume, setVolume] = useState("")
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!ticker || !price || !volume) {
      toast({
        title: "Missing Fields",
        description: "Please fill all fields.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, price: parseFloat(price), volume: parseInt(volume) }),
      })

      if (!response.ok) throw new Error("Failed to add trade")

      setTicker("")
      setPrice("")
      setVolume("")
      toast({ title: "Trade Added", description: `Trade for ${ticker} added.` })

      // Trigger refresh
      onTradeAdded()
    } catch (err) {
      toast({ title: "Error", description: "Failed to add trade.", variant: "destructive" })
      console.error(err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">Add Trade</h2>
      <Input
        placeholder="Ticker"
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase())}
      />
      <Input
        placeholder="Price"
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <Input
        placeholder="Volume"
        type="number"
        value={volume}
        onChange={(e) => setVolume(e.target.value)}
      />
      <Button type="submit">Add Trade</Button>
    </form>
  )
}
