"use client"

import { useState } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Moon, Sun, TrendingUp } from "lucide-react"
import { useTheme } from "next-themes"
import TradeForm from "@/components/trade-form"
import TradeTable from "@/components/trade-table"
import NotificationPanel from "@/components/notification-panel"
import AveragePrices from "@/components/average-prices"
import AnalysisSection from "@/components/analysis-section"
import TradingSimulation from "@/components/TradingSimulation"
import { Toaster } from "@/components/ui/toaster"

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button variant="outline" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

function TradingDashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Function to trigger refresh of trade table when new trade is added
  const handleTradeAdded = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Trading System</h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Forms and Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Trade Form */}
            <TradeForm onTradeAdded={handleTradeAdded} />

            {/* Analysis Section */}
            <AnalysisSection />

            {/* Average Prices */}
            <AveragePrices />
          </div>

          {/* Right Column - Data Display */}
          <div className="lg:col-span-2 space-y-6">
            {/* Notifications Panel */}
            <NotificationPanel />

            {/* Trades Table */}
            <TradeTable refreshTrigger={refreshTrigger} />

            {/* Trading Simulation */}
            <TradingSimulation />
          </div>
        </div>
      </main>
    </div>
  )
}

export default function Page() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TradingDashboard />
      <Toaster />
    </ThemeProvider>
  )
}