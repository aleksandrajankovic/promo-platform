"use client";

import AdminTableCard from "../../components/AdminTableCard";

export default function EngagementTab({
  countdownTargetIso, setCountdownTargetIso,
  countdownLabel, setCountdownLabel,
  leaderboardEnabled, setLeaderboardEnabled,
  leaderboardFeedUrl, setLeaderboardFeedUrl,
}) {
  return (
    <div className="space-y-6">
      <AdminTableCard title="Countdown Timer">
        <div className="p-4 space-y-4">
          <label className="block">
            <span className="mb-1 inline-block text-sm text-neutral-600">Target date and time</span>
            <input
              type="datetime-local"
              className="w-full border border-[#D0D0D0] rounded px-2.5 py-2 text-sm"
              value={countdownTargetIso}
              onChange={(e) => setCountdownTargetIso(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 inline-block text-sm text-neutral-600">Label</span>
            <input
              className="w-full border border-[#D0D0D0] rounded px-2.5 py-2 text-sm"
              value={countdownLabel}
              onChange={(e) => setCountdownLabel(e.target.value)}
              placeholder="Kalendar se otvara za"
            />
          </label>
        </div>
      </AdminTableCard>

      <AdminTableCard title="Leaderboard">
        <div className="p-4 space-y-4">
          <div className="flex gap-3 flex-wrap">
            {[
              { value: false, label: "Off" },
              { value: true, label: "On" },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setLeaderboardEnabled(opt.value)}
                className={[
                  "px-5 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors",
                  leaderboardEnabled === opt.value
                    ? "border-[#AC1C09] bg-red-50 text-[#AC1C09]"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="mb-1 inline-block text-sm text-neutral-600">Google Sheet CSV link</span>
            <input
              className="w-full border border-[#D0D0D0] rounded px-2.5 py-2 text-sm"
              value={leaderboardFeedUrl}
              onChange={(e) => setLeaderboardFeedUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
            />
          </label>
        </div>
      </AdminTableCard>
    </div>
  );
}
