"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";

const ALL_TIMEZONES: string[] = Intl.supportedValuesOf("timeZone");

interface BlackoutDate {
  id: string;
  startDate: string;
  endDate: string;
  label: string | null;
}

interface Props {
  timezone: string;
  workStartHour: number;
  workEndHour: number;
  blackoutDates: BlackoutDate[];
}

function hourLabel(h: number) {
  if (h === 0) return "12:00 AM";
  if (h === 12) return "12:00 PM";
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
}

export default function SettingsForm({ timezone: tz, workStartHour: wsh, workEndHour: weh, blackoutDates: bd }: Props) {
  const [timezone, setTimezone] = useState(tz);
  const [workStartHour, setWorkStartHour] = useState(wsh);
  const [workEndHour, setWorkEndHour] = useState(weh);
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>(bd);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Blackout form
  const [addingBlackout, setAddingBlackout] = useState(false);
  const [boStart, setBoStart] = useState("");
  const [boEnd, setBoEnd] = useState("");
  const [boLabel, setBoLabel] = useState("");

  const router = useRouter();

  async function saveSettings() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone, workStartHour, workEndHour }),
    });
    setSaved(true);
    router.refresh();
    setSaving(false);
    setTimeout(() => setSaved(false), 2500);
  }

  async function addBlackout() {
    if (!boStart || !boEnd) return;
    const res = await fetch("/api/blackout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: boStart, endDate: boEnd, label: boLabel || null }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error ?? "Failed to add blackout date.");
      return;
    }
    setBlackoutDates((prev) => [data, ...prev]);
    setAddingBlackout(false);
    setBoStart("");
    setBoEnd("");
    setBoLabel("");
  }

  async function deleteBlackout(id: string) {
    await fetch("/api/blackout", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBlackoutDates((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Timezone */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Timezone</p>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="glass-input w-full rounded-xl px-4 py-3 text-sm"
        >
          {ALL_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        <p className="text-xs text-tertiary">
          Used to correctly classify late-night and weekend commits in your local time.
        </p>
      </div>

      {/* Work hours */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Work Hours</p>
        <p className="text-xs text-tertiary">
          Commits outside your work hours count toward your burnout score. Set this to your actual schedule.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[120px]">
            <p className="text-xs text-secondary mb-1.5">Work day starts</p>
            <select
              value={workStartHour}
              onChange={(e) => setWorkStartHour(parseInt(e.target.value))}
              className="glass-input w-full rounded-xl px-3 py-2.5 text-sm"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{hourLabel(i)}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <p className="text-xs text-secondary mb-1.5">Late night begins</p>
            <select
              value={workEndHour}
              onChange={(e) => setWorkEndHour(parseInt(e.target.value))}
              className="glass-input w-full rounded-xl px-3 py-2.5 text-sm"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{hourLabel(i)}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-tertiary">
          Current: commits before {hourLabel(workStartHour)} or after {hourLabel(workEndHour)} are flagged.
        </p>
      </div>

      <button
        onClick={saveSettings}
        disabled={saving}
        className="btn-primary flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium"
      >
        {saved ? <Check size={15} style={{ color: "#30D158" }} /> : null}
        {saving ? "Saving…" : saved ? "Saved!" : "Save settings"}
      </button>

      {/* Vacation / Blackout dates */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
              Vacation / Blackout Dates
            </p>
            <p className="text-xs text-tertiary mt-1">
              Commits on these dates are excluded from burnout calculations.
            </p>
          </div>
          <button
            onClick={() => setAddingBlackout(true)}
            className="btn-glass flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs"
          >
            <Plus size={13} />
            Add
          </button>
        </div>

        {addingBlackout && (
          <div className="glass-subtle rounded-xl p-4 space-y-3">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[130px]">
                <p className="text-xs text-secondary mb-1">Start date</p>
                <input
                  type="date"
                  value={boStart}
                  onChange={(e) => setBoStart(e.target.value)}
                  className="glass-input w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1 min-w-[130px]">
                <p className="text-xs text-secondary mb-1">End date</p>
                <input
                  type="date"
                  value={boEnd}
                  onChange={(e) => setBoEnd(e.target.value)}
                  className="glass-input w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
            <input
              type="text"
              placeholder="Label (optional, e.g. Summer vacation)"
              value={boLabel}
              onChange={(e) => setBoLabel(e.target.value)}
              className="glass-input w-full rounded-xl px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button onClick={addBlackout} className="btn-primary flex-1 rounded-xl py-2 text-sm font-medium">
                Add
              </button>
              <button onClick={() => setAddingBlackout(false)} className="btn-glass flex-1 rounded-xl py-2 text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {blackoutDates.length === 0 && !addingBlackout ? (
          <p className="text-tertiary text-sm text-center py-4">No blackout dates added.</p>
        ) : (
          <ul className="space-y-2">
            {blackoutDates.map((d) => (
              <li key={d.id} className="glass-subtle rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-primary font-medium">
                    {d.label ?? "Time off"}
                  </p>
                  <p className="text-xs text-tertiary mt-0.5">
                    {String(d.startDate).slice(0, 10)} → {String(d.endDate).slice(0, 10)}
                  </p>
                </div>
                <button
                  onClick={() => deleteBlackout(d.id)}
                  className="text-tertiary hover:text-primary transition"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
