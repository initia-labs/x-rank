import { useAtom } from "@effect/atom-react"
import type { DateRange } from "../api.ts"
import { customRangeAtom, includeRepliesAtom, modeAtom, rangeAtom, scoreAtom, weekOfAtom } from "../atoms.ts"
import { ranges } from "../metrics.ts"
import type { DashboardModel } from "../model.ts"
import { Hint } from "./parts.tsx"

export function RangeControls({ dashboard }: { readonly dashboard: DashboardModel }) {
  const [mode, setMode] = useAtom(modeAtom)
  const [range, setRange] = useAtom(rangeAtom)
  const [, setWeekOf] = useAtom(weekOfAtom)
  const [score, setScore] = useAtom(scoreAtom)
  const [includeReplies, setIncludeReplies] = useAtom(includeRepliesAtom)
  const [, setCustomRange] = useAtom(customRangeAtom)
  const { weekChoices, currentWeekIso, selectedWeekIso, inProgress, customRange } = dashboard

  return (
    <section className="range-controls">
      <div className="control-block window-control">
        <span className="control-label">Window</span>
        <div className="control-row">
          <div className="range-modes" role="group" aria-label="Range mode">
            <ModeButton active={mode === "rolling"} label="Rolling" onClick={() => setMode("rolling")} />
            <ModeButton active={mode === "weekly"} label="Weekly (Sun–Sun)" onClick={() => setMode("weekly")} />
            <ModeButton active={mode === "custom"} label="Custom" onClick={() => setMode("custom")} />
          </div>
          {mode === "custom" ? (
            <div className="date-range" role="group" aria-label="Custom range">
              <DateInput
                label="From"
                max={customRange.to}
                min={customRange.min}
                onChange={(from) => setCustomRange({ from, to: customRange.to })}
                value={customRange.from}
              />
              <span aria-hidden="true" className="date-range-sep">
                →
              </span>
              <DateInput
                label="To"
                max={customRange.max}
                min={customRange.from}
                onChange={(to) => setCustomRange({ from: customRange.from, to })}
                value={customRange.to}
              />
            </div>
          ) : mode === "rolling" ? (
            <div className="range-chips" role="group" aria-label="Rolling window">
              {ranges.map((r) => (
                <ChipButton
                  active={range === r.id}
                  key={r.id}
                  label={r.label}
                  onClick={() => setRange(r.id as DateRange)}
                />
              ))}
            </div>
          ) : (
            <div className="range-chips weekly" role="group" aria-label="Week">
              {weekChoices.map((w) => {
                const selected = selectedWeekIso === w.iso
                const isCurrent = w.iso === currentWeekIso
                const label = isCurrent ? `${w.label} (in progress)` : `Week of ${w.label}`
                return isCurrent ? (
                  <ChipButton
                    active={selected}
                    key={w.iso}
                    label={label}
                    onClick={() => setWeekOf(w.iso)}
                    tone="partial"
                  />
                ) : (
                  <ChipButton active={selected} key={w.iso} label={label} onClick={() => setWeekOf(w.iso)} />
                )
              })}
            </div>
          )}
        </div>
        {mode === "weekly" && inProgress && (
          <p className="range-note">This week is still in progress; comparisons against prior weeks are partial.</p>
        )}
        {mode === "custom" && (
          <p className="range-note">
            Dates are UTC. Compared against the {dashboard.windowDays === 1 ? "day" : `${dashboard.windowDays} days`}{" "}
            before.{inProgress ? " The last day is still in progress." : ""}
          </p>
        )}
      </div>
      <div className="range-divider" aria-hidden="true" />
      <div className="control-block score-control">
        <span className="control-label">Score</span>
        <div className="range-modes score-modes" role="group" aria-label="Score">
          <ModeButton active={score === "posts"} label="Tweets / week" onClick={() => setScore("posts")} />
          <ModeButton active={score === "streak"} label="Streak" onClick={() => setScore("streak")} />
          <ModeButton active={score === "engagements"} label="Engagements" onClick={() => setScore("engagements")} />
          <ModeButton active={score === "impressions"} label="Impressions" onClick={() => setScore("impressions")} />
        </div>
      </div>
      <label className="reply-toggle">
        <input
          checked={includeReplies}
          onChange={(event) => setIncludeReplies(event.currentTarget.checked)}
          type="checkbox"
        />
        <span aria-hidden="true" className="reply-toggle-track">
          <span />
        </span>
        <Hint label="When on, authored replies count toward posts, engagements, impressions, and posting streaks.">
          Count reply posts
        </Hint>
      </label>
    </section>
  )
}

function ModeButton({
  active,
  label,
  onClick
}: {
  readonly active: boolean
  readonly label: string
  readonly onClick: () => void
}) {
  return (
    <button aria-pressed={active} className={active ? "mode-btn active" : "mode-btn"} onClick={onClick} type="button">
      {label}
    </button>
  )
}

function DateInput({
  label,
  max,
  min,
  onChange,
  value
}: {
  readonly label: string
  readonly max: string
  readonly min: string
  readonly onChange: (value: string) => void
  readonly value: string
}) {
  return (
    <input
      aria-label={label}
      className="date-input"
      max={max}
      min={min}
      onChange={(event) => {
        const next = event.currentTarget.value
        if (next && next >= min && next <= max) onChange(next)
      }}
      type="date"
      value={value}
    />
  )
}

function ChipButton({
  active,
  label,
  onClick,
  tone
}: {
  readonly active: boolean
  readonly label: string
  readonly onClick: () => void
  readonly tone?: "partial"
}) {
  const cls = ["chip-btn", active ? "active" : "", tone ? `tone-${tone}` : ""].filter(Boolean).join(" ")
  return (
    <button aria-pressed={active} className={cls} onClick={onClick} type="button">
      {label}
    </button>
  )
}
