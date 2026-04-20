"use client";

import { useState } from "react";
import Link from "next/link";

const AI_TOOLS = [
  { name: "ChatGPT Plus", price: 20 },
  { name: "Claude Pro", price: 20 },
  { name: "Claude Max", price: 100 },
  { name: "Gemini Advanced", price: 20 },
  { name: "GitHub Copilot", price: 10 },
  { name: "Cursor Pro", price: 20 },
  { name: "Custom", price: 0 },
];

const HOURLY_RATES: { label: string; rate: number }[] = [
  { label: "Student / Entry level", rate: 15 },
  { label: "Junior developer", rate: 30 },
  { label: "Mid-level developer", rate: 50 },
  { label: "Senior developer", rate: 75 },
  { label: "Staff / Principal", rate: 100 },
  { label: "Freelancer ($50-100/hr)", rate: 75 },
  { label: "Freelancer ($100-200/hr)", rate: 150 },
  { label: "Custom", rate: 0 },
];

function formatCurrency(val: number): string {
  return val.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function AiRoiPage() {
  const [selectedTool, setSelectedTool] = useState("Claude Pro");
  const [monthlyCost, setMonthlyCost] = useState(20);
  const [selectedRate, setSelectedRate] = useState("Mid-level developer");
  const [hourlyRate, setHourlyRate] = useState(50);
  const [hoursPerWeek, setHoursPerWeek] = useState(5);
  const [calculated, setCalculated] = useState(false);

  const monthlyHoursSaved = hoursPerWeek * 4.33;
  const monthlyValueGenerated = monthlyHoursSaved * hourlyRate;
  const monthlyROI = monthlyValueGenerated - monthlyCost;
  const roiMultiplier = monthlyCost > 0 ? monthlyValueGenerated / monthlyCost : 0;
  const annualROI = monthlyROI * 12;
  const breakEvenHours = monthlyCost > 0 && hourlyRate > 0 ? monthlyCost / hourlyRate : 0;

  const isWorthIt = monthlyROI > 0;

  const shareText = calculated
    ? `My AI subscription ROI: ${roiMultiplier.toFixed(1)}x return\n\n$${monthlyCost}/mo cost → $${Math.round(monthlyValueGenerated)}/mo value generated\n\nAnnual net gain: ${formatCurrency(annualROI)}\n\nCalculate yours: https://binkraft-tools.vercel.app/ai-roi`
    : "";

  return (
    <main className="flex-1 bg-gradient-to-b from-blue-50 to-white">
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link href="/" className="text-sm text-zinc-400 hover:underline">
          ← All tools
        </Link>

        <h1 className="mt-4 text-2xl font-black text-zinc-900 sm:text-3xl">
          AI Subscription ROI Calculator
        </h1>
        <p className="mt-2 text-zinc-500">
          Is your AI subscription paying for itself? Find out in 30 seconds.
        </p>

        {/* AI Tool Selection */}
        <div className="mt-8">
          <label className="block text-sm font-bold text-zinc-700 mb-2">
            Which AI tool are you using?
          </label>
          <div className="flex flex-wrap gap-2">
            {AI_TOOLS.map((tool) => (
              <button
                key={tool.name}
                onClick={() => {
                  setSelectedTool(tool.name);
                  if (tool.price > 0) setMonthlyCost(tool.price);
                  setCalculated(false);
                }}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  selectedTool === tool.name
                    ? "bg-blue-600 text-white"
                    : "border border-blue-200 text-blue-700 hover:bg-blue-50"
                }`}
              >
                {tool.name} {tool.price > 0 && `($${tool.price}/mo)`}
              </button>
            ))}
          </div>
          {selectedTool === "Custom" && (
            <input
              type="number"
              value={monthlyCost}
              onChange={(e) => { setMonthlyCost(Number(e.target.value) || 0); setCalculated(false); }}
              placeholder="Monthly cost ($)"
              className="mt-2 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            />
          )}
        </div>

        {/* Hourly Rate */}
        <div className="mt-6">
          <label className="block text-sm font-bold text-zinc-700 mb-2">
            Your hourly rate (or value of your time)
          </label>
          <div className="flex flex-wrap gap-2">
            {HOURLY_RATES.map((r) => (
              <button
                key={r.label}
                onClick={() => {
                  setSelectedRate(r.label);
                  if (r.rate > 0) setHourlyRate(r.rate);
                  setCalculated(false);
                }}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  selectedRate === r.label
                    ? "bg-blue-600 text-white"
                    : "border border-blue-200 text-blue-700 hover:bg-blue-50"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {selectedRate === "Custom" && (
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => { setHourlyRate(Number(e.target.value) || 0); setCalculated(false); }}
              placeholder="Hourly rate ($)"
              className="mt-2 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            />
          )}
        </div>

        {/* Hours Saved */}
        <div className="mt-6">
          <label className="block text-sm font-bold text-zinc-700 mb-2">
            How many hours per week does AI save you?
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0.5}
              max={30}
              step={0.5}
              value={hoursPerWeek}
              onChange={(e) => { setHoursPerWeek(Number(e.target.value)); setCalculated(false); }}
              className="flex-1 accent-blue-600"
            />
            <span className="w-20 text-center text-lg font-bold text-blue-700">
              {hoursPerWeek}h/wk
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Think about: writing, coding, research, emails, brainstorming, debugging
          </p>
        </div>

        {/* Calculate Button */}
        <button
          onClick={() => setCalculated(true)}
          className="mt-8 w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 active:scale-[0.98]"
        >
          Calculate My ROI
        </button>

        {/* Results */}
        {calculated && (
          <div className="mt-8 space-y-6">
            {/* Main Result */}
            <div className={`rounded-2xl p-6 text-white shadow-lg ${
              isWorthIt
                ? "bg-gradient-to-br from-green-600 to-emerald-500"
                : "bg-gradient-to-br from-red-600 to-orange-500"
            }`}>
              <p className="text-sm opacity-80">Your AI subscription is...</p>
              <p className="mt-2 text-3xl font-black sm:text-4xl">
                {isWorthIt ? "Worth It" : "Not Worth It (Yet)"}
              </p>
              <p className="mt-1 text-lg font-bold opacity-90">
                {roiMultiplier.toFixed(1)}x return on investment
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/20 p-3 text-center">
                  <p className="text-xs opacity-80">Monthly cost</p>
                  <p className="text-xl font-black">{formatCurrency(monthlyCost)}</p>
                </div>
                <div className="rounded-lg bg-white/20 p-3 text-center">
                  <p className="text-xs opacity-80">Monthly value</p>
                  <p className="text-xl font-black">{formatCurrency(monthlyValueGenerated)}</p>
                </div>
              </div>

              <div className="mt-3 rounded-lg bg-white/20 p-3 text-center">
                <p className="text-xs opacity-80">Annual net gain</p>
                <p className="text-2xl font-black">{formatCurrency(annualROI)}</p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-bold text-zinc-900">Breakdown</h2>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between rounded-lg bg-zinc-50 px-4 py-2.5">
                  <span className="text-sm text-zinc-600">Time saved per month</span>
                  <span className="text-sm font-bold text-zinc-900">{monthlyHoursSaved.toFixed(1)} hours</span>
                </div>
                <div className="flex justify-between rounded-lg bg-zinc-50 px-4 py-2.5">
                  <span className="text-sm text-zinc-600">Value of time saved</span>
                  <span className="text-sm font-bold text-green-700">{formatCurrency(monthlyValueGenerated)}/mo</span>
                </div>
                <div className="flex justify-between rounded-lg bg-zinc-50 px-4 py-2.5">
                  <span className="text-sm text-zinc-600">Subscription cost</span>
                  <span className="text-sm font-bold text-red-600">-{formatCurrency(monthlyCost)}/mo</span>
                </div>
                <div className="flex justify-between rounded-lg bg-blue-50 px-4 py-2.5">
                  <span className="text-sm font-bold text-zinc-900">Break-even point</span>
                  <span className="text-sm font-bold text-blue-700">{breakEvenHours.toFixed(1)} hours/month</span>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-400">
                You only need to save {breakEvenHours.toFixed(1)} hours per month ({(breakEvenHours / 4.33).toFixed(1)} hours per week) to break even.
              </p>
            </div>

            {/* Share */}
            <a
              href={`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 py-4 text-sm font-bold text-white hover:bg-zinc-700 transition"
            >
              Share on X
            </a>

            {/* Related Tools */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-sm font-bold text-zinc-600 mb-3">More tools</p>
              <div className="grid grid-cols-1 gap-2">
                <Link
                  href="/meeting"
                  className="rounded-lg bg-blue-50 p-3 text-center text-sm font-medium text-blue-700 hover:bg-blue-100 transition"
                >
                  Meeting Cost Calculator
                </Link>
                <Link
                  href="/commute"
                  className="rounded-lg bg-sky-50 p-3 text-center text-sm font-medium text-sky-700 hover:bg-sky-100 transition"
                >
                  Commute Time Lifetime Calculator
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
