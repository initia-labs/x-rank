import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useMemo, useState, type ReactNode } from "react"
import { Avatar } from "../Avatar.tsx"
import type { Account } from "../data.ts"
import type { LeaderboardEntry } from "../model.ts"
import { formatMetric, formatNumber, totalEngagements } from "../model.ts"
import { Sparkline } from "./parts.tsx"

const dayMonthFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
const activityDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC"
})

const HISTORY_W = 540
const HISTORY_H = 90
const HISTORY_PAD_X = 8
const HISTORY_PAD_Y = 6

export function AccountModal({
  account,
  children,
  entry
}: {
  readonly account: Account
  readonly children: ReactNode
  readonly entry: LeaderboardEntry
}) {
  const totalEng = entry.performance.engagements
  const profileUrl = `https://x.com/${account.handle}`
  const [sortBy, setSortBy] = useState<"engagement" | "newest">("engagement")
  const sortedPosts = useMemo(
    () =>
      sortBy === "newest"
        ? account.posts.toSorted((a, b) => b.createdAtMs - a.createdAtMs)
        : account.posts.toSorted((a, b) => totalEngagements(b.stats) - totalEngagements(a.stats)),
    [account.posts, sortBy]
  )

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{children}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-overlay" />
        <DialogPrimitive.Content className="modal-content" aria-describedby={undefined}>
          <header className="modal-header">
            <Avatar account={account} size="xl" />
            <div className="modal-identity">
              <DialogPrimitive.Title asChild>
                <h2>{account.name}</h2>
              </DialogPrimitive.Title>
              <a className="modal-handle" href={profileUrl} rel="noreferrer" target="_blank">
                @{account.handle} ↗
              </a>
            </div>
            <div className="modal-rank">
              {entry.value > 0 ? <strong>#{entry.rank}</strong> : null}
              <span>{formatNumber(totalEng)} eng</span>
            </div>
            <DialogPrimitive.Close className="modal-close" aria-label="Close">
              ×
            </DialogPrimitive.Close>
          </header>

          <div className="modal-stats">
            <div className="modal-stat">
              <span>Tweets</span>
              <strong>{formatNumber(account.stats.posts)}</strong>
            </div>
            <div className="modal-stat">
              <span>Impressions</span>
              <strong>{formatNumber(account.stats.impressions)}</strong>
            </div>
            <div className="modal-stat">
              <span>Followers</span>
              <strong>{formatNumber(account.followers)}</strong>
            </div>
            <div className="modal-stat">
              <span>Rate</span>
              <strong>{formatMetric(entry.performance.engagementRate, "percent")}</strong>
            </div>
            <div className="modal-stat streak-stat">
              <span>Workday streak</span>
              <strong
                className={
                  account.currentPostingStreak > 0 && account.currentPostingStreak === account.longestPostingStreak
                    ? "personal-best"
                    : undefined
                }
              >
                {account.currentPostingStreak > 0 ? `${account.currentPostingStreak}d` : "—"}
              </strong>
              <small>best {account.longestPostingStreak}d · Mon–Fri</small>
            </div>
            <div className="modal-stat">
              <span>7d shape</span>
              <Sparkline values={account.dailyEngagement} />
            </div>
          </div>

          <PostingHeatmap account={account} />

          <FollowerHistoryPanel account={account} />

          <div className="modal-sort">
            <span>Sort:</span>
            <button
              type="button"
              className={sortBy === "engagement" ? "modal-sort-btn active" : "modal-sort-btn"}
              onClick={() => setSortBy("engagement")}
            >
              by engagement
            </button>
            <button
              type="button"
              className={sortBy === "newest" ? "modal-sort-btn active" : "modal-sort-btn"}
              onClick={() => setSortBy("newest")}
            >
              newest
            </button>
          </div>

          <div className="modal-posts">
            {sortedPosts.length === 0 ? (
              <p className="modal-empty">No posts in this period.</p>
            ) : (
              sortedPosts.map((post) => (
                <a className="modal-post" href={post.url} key={post.url} rel="noreferrer" target="_blank">
                  <div className="modal-post-meta">
                    <span>{post.createdAt}</span>
                    <strong>{formatNumber(totalEngagements(post.stats))} eng</strong>
                    <span>{formatNumber(post.stats.impressions)} imp</span>
                  </div>
                  <p className="modal-post-text">{post.text}</p>
                </a>
              ))
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function PostingHeatmap({ account }: { readonly account: Account }) {
  const activity = account.postingActivity
  const totalPosts = activity.reduce((sum, day) => sum + day.posts, 0)
  const activeDays = activity.filter((day) => day.posts > 0).length
  const maxPosts = Math.max(0, ...activity.map((day) => day.posts))
  const weekendPosts = activity.reduce((sum, day) => {
    const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay()
    return weekday === 0 || weekday === 6 ? sum + day.posts : sum
  }, 0)
  const firstDay = activity[0]
  const leadingEmptyDays = firstDay ? new Date(`${firstDay.date}T00:00:00Z`).getUTCDay() : 0
  const level = (posts: number) => (posts === 0 || maxPosts === 0 ? 0 : Math.max(1, Math.ceil((posts / maxPosts) * 4)))

  return (
    <section
      className="posting-heatmap"
      aria-label={`${totalPosts} posts across ${activeDays} days in the last 90 days`}
    >
      <header className="posting-heatmap-header">
        <span>Posting activity · 90 days</span>
        <span>
          {formatNumber(totalPosts)} posts · {activeDays} active days
        </span>
      </header>
      <div className="posting-heatmap-scroll">
        <div className="posting-heatmap-body">
          <div className="posting-weekdays" aria-hidden="true">
            <span className="weekend">Sun</span>
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
            <span className="weekend">Sat</span>
          </div>
          <div className="posting-cells" role="img" aria-label={`Daily posting activity for @${account.handle}`}>
            {Array.from({ length: leadingEmptyDays }, (_, index) => (
              <span className="posting-cell spacer" aria-hidden="true" key={`spacer-${index}`} />
            ))}
            {activity.map((day) => {
              const label = `${day.posts} ${day.posts === 1 ? "post" : "posts"} on ${activityDateFormatter.format(new Date(day.date))}`
              return (
                <span className="posting-cell" data-level={level(day.posts)} key={day.date} title={label}>
                  <span className="sr-only">{label}</span>
                </span>
              )
            })}
          </div>
        </div>
      </div>
      <div className="posting-heatmap-footer">
        <span
          className="posting-weekend-count"
          title="Weekend tweets count toward Tweets / week but Saturday and Sunday are skipped for streaks."
        >
          {weekendPosts} weekend tweets · weekends don't break streaks
        </span>
        <div className="posting-legend" aria-hidden="true">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((value) => (
            <span className="posting-cell" data-level={value} key={value} />
          ))}
          <span>More</span>
        </div>
      </div>
    </section>
  )
}

function FollowerHistoryPanel({ account }: { readonly account: Account }) {
  const history = account.followerHistory
  const geometry = useMemo(() => {
    if (history.length < 2) return null
    const minF = Math.min(...history.map((h) => h.followers))
    const maxF = Math.max(...history.map((h) => h.followers))
    const range = Math.max(1, maxF - minF)
    const stepX = (HISTORY_W - HISTORY_PAD_X * 2) / (history.length - 1)
    const points = history.map((sample, idx) => {
      const x = HISTORY_PAD_X + idx * stepX
      const y = HISTORY_PAD_Y + (1 - (sample.followers - minF) / range) * (HISTORY_H - HISTORY_PAD_Y * 2)
      return { x, y, sample }
    })
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
    const lastX = points[points.length - 1]!.x
    const area = `${path} L ${lastX} ${HISTORY_H - HISTORY_PAD_Y} L ${HISTORY_PAD_X} ${HISTORY_H - HISTORY_PAD_Y} Z`
    return { minF, maxF, points, path, area }
  }, [history])

  if (!geometry) return null
  const { minF, maxF, points, path, area } = geometry

  return (
    <div className="modal-follower-history">
      <div className="modal-follower-header">
        <span>Follower history</span>
        <span className="modal-follower-range">
          {formatNumber(minF)} → {formatNumber(maxF)} · {history.length} day
          {history.length === 1 ? "" : "s"}
        </span>
      </div>
      <svg className="modal-follower-chart" viewBox={`0 0 ${HISTORY_W} ${HISTORY_H}`} preserveAspectRatio="none">
        <path d={area} fill={account.color} fillOpacity={0.18} />
        <path
          d={path}
          fill="none"
          stroke={account.color}
          strokeWidth={1.6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p) => (
          <circle cx={p.x} cy={p.y} r={2.4} fill={account.color} key={p.sample.date}>
            <title>{`${p.sample.date} · ${formatNumber(p.sample.followers)} followers`}</title>
          </circle>
        ))}
      </svg>
      <ul className="modal-follower-rows">
        {history
          .slice(-7)
          .toReversed()
          .map((sample, idx, arr) => {
            const next = arr[idx + 1]
            const delta = next ? sample.followers - next.followers : undefined
            return (
              <li className="modal-follower-row" key={sample.date}>
                <span className="modal-follower-date">{dayMonthFormatter.format(new Date(sample.date))}</span>
                <span className="modal-follower-count">{formatNumber(sample.followers)}</span>
                {delta !== undefined && (
                  <span
                    className={
                      delta > 0
                        ? "modal-follower-delta up"
                        : delta < 0
                          ? "modal-follower-delta down"
                          : "modal-follower-delta"
                    }
                  >
                    {delta > 0 ? "+" : ""}
                    {formatNumber(delta)}
                  </span>
                )}
              </li>
            )
          })}
      </ul>
    </div>
  )
}
