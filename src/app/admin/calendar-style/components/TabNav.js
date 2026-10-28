"use client";

export default function TabNav({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 border-b border-neutral-200 mb-6 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={[
            "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
            active === tab.key
              ? "border-admin-brand text-admin-brand"
              : "border-transparent text-neutral-500 hover:text-neutral-800",
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
