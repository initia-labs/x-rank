import { Array as Arr, DateTime } from "effect"
import {
  ENGAGEMENT_KEYS,
  type Account,
  type EngagementStats,
  type SocialMetricsSnapshot,
  type TopPost,
  type TrendPoint
} from "./api.ts"
import type { Dataset, DatasetAccount, DatasetTweet, FollowerPoint } from "./dataset.ts"
import { rangeDays, totalEngagements, type WindowSpec } from "./metrics.ts"
import { postingActivity, postingDays, postingStreaks, type PostingStreaks } from "./posting.ts"

const DAY_MS = 1000 * 60 * 60 * 24
const TREND_DAYS = 7

const dayKey = (timestampMs: number) => Math.floor(timestampMs / DAY_MS)

const aggregateTweets = (tweets: ReadonlyArray<DatasetTweet>): EngagementStats => {
  const breakdown: Record<(typeof ENGAGEMENT_KEYS)[number], number> = {
    likes: 0,
    replies: 0,
    reposts: 0,
    quotes: 0,
    bookmarks: 0
  }
  let impressions = 0
  const days = new Set<number>()
  for (const tweet of tweets) {
    impressions += tweet.impressions
    for (const key of ENGAGEMENT_KEYS) breakdown[key] += tweet[key]
    days.add(dayKey(tweet.created_at))
  }
  return { ...breakdown, posts: tweets.length, impressions, activeDays: days.size }
}

const topPostDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York"
})

const tweetToTopPost = (tweet: DatasetTweet, handle: string): TopPost => ({
  text: tweet.text,
  createdAt: topPostDateFormatter.format(new Date(tweet.created_at)),
  createdAtMs: tweet.created_at,
  url: tweet.url || `https://x.com/${handle}/status/${tweet.id}`,
  stats: {
    impressions: tweet.impressions,
    likes: tweet.likes,
    replies: tweet.replies,
    reposts: tweet.reposts,
    quotes: tweet.quotes,
    bookmarks: tweet.bookmarks
  }
})

const POSTS_PER_ACCOUNT_LIMIT = 30

const sortPostsByEngagement = (tweets: ReadonlyArray<DatasetTweet>, handle: string): ReadonlyArray<TopPost> =>
  tweets
    .toSorted((a, b) => totalEngagements(b) - totalEngagements(a))
    .slice(0, POSTS_PER_ACCOUNT_LIMIT)
    .map((tweet) => tweetToTopPost(tweet, handle))

const dayLabelFormatter = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" })

/**
 * Bucket tweets into a fixed number of day-aligned slots ending at `now`.
 * Slot index 0 is the oldest day (`days - 1` ago); slot `days - 1` is today.
 * The seed is per-call so each bucket is mutated independently.
 */
const bucketTweetsByDayOffset = <T>(
  tweets: ReadonlyArray<DatasetTweet>,
  now: number,
  days: number,
  seed: () => T,
  step: (acc: T, tweet: DatasetTweet) => void
): Array<T> => {
  const today = dayKey(now)
  const buckets: Array<T> = Array.from({ length: days }, seed)
  for (const tweet of tweets) {
    const offset = today - dayKey(tweet.created_at)
    if (offset < 0 || offset >= days) continue
    step(buckets[days - 1 - offset], tweet)
  }
  return buckets
}

const buildTrend = (tweets: ReadonlyArray<DatasetTweet>, now: number): ReadonlyArray<TrendPoint> => {
  const buckets = bucketTweetsByDayOffset(
    tweets,
    now,
    TREND_DAYS,
    () => ({ posts: 0, engagements: 0, impressions: 0 }),
    (bucket, tweet) => {
      bucket.posts += 1
      bucket.engagements += totalEngagements(tweet)
      bucket.impressions += tweet.impressions
    }
  )
  return buckets.map((bucket, idx) => ({
    label: dayLabelFormatter.format(new Date(now - (TREND_DAYS - 1 - idx) * DAY_MS)),
    posts: bucket.posts,
    engagements: bucket.engagements,
    impressions: bucket.impressions
  }))
}

const dailyEngagementBuckets = (tweets: ReadonlyArray<DatasetTweet>, now: number): ReadonlyArray<number> =>
  bucketTweetsByDayOffset<{ value: number }>(
    tweets,
    now,
    TREND_DAYS,
    () => ({ value: 0 }),
    (bucket, tweet) => {
      bucket.value += totalEngagements(tweet)
    }
  ).map((b) => b.value)

const isoDateInETFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
})
const isoDateInET = (ms: number) => isoDateInETFormatter.format(new Date(ms))

const bucketFollowerHistoryByDay = (
  rows: ReadonlyArray<{ readonly captured_at: number; readonly followers: number }>
): ReadonlyArray<{ readonly date: string; readonly followers: number }> => {
  const byDay = new Map<string, { ts: number; followers: number }>()
  for (const r of rows) {
    const date = isoDateInET(r.captured_at)
    const existing = byDay.get(date)
    if (!existing || existing.ts < r.captured_at) byDay.set(date, { ts: r.captured_at, followers: r.followers })
  }
  return [...byDay.entries()]
    .map(([date, { followers }]) => ({ date, followers }))
    .toSorted((a, b) => a.date.localeCompare(b.date))
}

const hourlyEngagementBuckets = (tweets: ReadonlyArray<DatasetTweet>): ReadonlyArray<number> => {
  const buckets: Array<number> = Array.from({ length: 24 }, () => 0)
  for (const tweet of tweets) {
    const hour = new Date(tweet.created_at).getUTCHours()
    buckets[hour] += totalEngagements(tweet)
  }
  return buckets
}

/** Latest sample from an ascending-by-captured_at series, or undefined if empty. */
const latestSample = (samples: ReadonlyArray<FollowerPoint>): FollowerPoint | undefined =>
  samples.length === 0 ? undefined : samples[samples.length - 1]

/** Latest sample with captured_at <= atOrBefore. Series must be ascending. */
const sampleAtOrBefore = (samples: ReadonlyArray<FollowerPoint>, atOrBefore: number): FollowerPoint | undefined => {
  let found: FollowerPoint | undefined
  for (const s of samples) {
    if (s.captured_at > atOrBefore) break
    found = s
  }
  return found
}

const accountToSnapshot = (
  account: DatasetAccount,
  tweets: ReadonlyArray<DatasetTweet>,
  followerSamples: ReadonlyArray<FollowerPoint>,
  earliestAllTime: number | undefined,
  streaks: PostingStreaks,
  activity: Account["postingActivity"],
  currentStart: number,
  currentEnd: number,
  previousStart: number,
  historyStart: number,
  bucketAnchor: number
): Account => {
  const current: Array<DatasetTweet> = []
  const previous: Array<DatasetTweet> = []
  for (const tweet of tweets) {
    if (tweet.created_at >= currentStart && tweet.created_at < currentEnd) current.push(tweet)
    else if (tweet.created_at >= previousStart && tweet.created_at < currentStart) previous.push(tweet)
  }
  const followersNow =
    sampleAtOrBefore(followerSamples, currentEnd)?.followers ?? latestSample(followerSamples)?.followers ?? 0
  const earliest = earliestAllTime ?? followersNow
  const followersPrev = sampleAtOrBefore(followerSamples, currentStart)?.followers ?? earliest
  const followersTwoBack = sampleAtOrBefore(followerSamples, previousStart)?.followers ?? followersPrev
  const recentHistory = followerSamples.filter((s) => s.captured_at >= historyStart)
  const followerHistory = bucketFollowerHistoryByDay(recentHistory)

  return {
    id: account.id,
    name: account.name,
    handle: account.handle,
    team: account.team,
    color: account.color,
    profileImageUrl: account.profile_image_url ?? undefined,
    followers: followersNow,
    previousFollowers: followersPrev,
    previousGrowth: followersPrev - followersTwoBack,
    currentPostingStreak: streaks.current,
    longestPostingStreak: streaks.longest,
    postingActivity: activity,
    stats: aggregateTweets(current),
    previousStats: aggregateTweets(previous),
    posts: sortPostsByEngagement(current, account.handle),
    dailyEngagement: dailyEngagementBuckets(current, bucketAnchor),
    hourlyEngagement: hourlyEngagementBuckets(current),
    followerHistory
  }
}

export const buildSnapshot = (dataset: Dataset, window: WindowSpec, includeReplies = false): SocialMetricsSnapshot => {
  const { capturedAt, firstRefreshAt } = dataset
  const currentStart = window.start
  const currentEnd = Math.min(window.end, capturedAt)
  const previousStart = window.previousStart
  // dailyEngagement / trend are anchored to the window end so weekly mode
  // shows the chosen week's daily shape rather than "today" mod 7.
  const bucketAnchor = currentEnd - 1
  const trendStart = bucketAnchor - TREND_DAYS * DAY_MS
  const historyStart = Math.min(currentEnd, capturedAt) - 30 * DAY_MS
  const initialBackfillStart = firstRefreshAt - rangeDays["7d"] * DAY_MS
  // Follower lookups must reach back to previousStart; historyStart feeds the 30d sparkline.
  const followerSince = Math.min(previousStart, historyStart)

  const allTweets = includeReplies ? dataset.tweets : dataset.tweets.filter((tweet) => tweet.is_reply === 0)
  const byAccount = Arr.groupBy(allTweets, (tweet) => tweet.account_id)
  const windowTweets = allTweets.filter((t) => t.created_at >= trendStart && t.created_at < currentEnd)
  const accounts = dataset.accounts.map((row) => {
    const tweets = byAccount[row.id] ?? []
    const postedAt = tweets.flatMap((tweet) => (tweet.created_at < capturedAt ? [tweet.created_at] : []))
    const days = postingDays(postedAt, row.timeZone)
    const followerSamples = (dataset.followerHistory[row.id] ?? []).filter((s) => s.captured_at >= followerSince)
    return accountToSnapshot(
      row,
      tweets,
      followerSamples,
      dataset.earliestFollowers[row.id],
      postingStreaks(days, capturedAt, row.timeZone),
      postingActivity(days, capturedAt, row.timeZone),
      currentStart,
      currentEnd,
      previousStart,
      historyStart,
      bucketAnchor
    )
  })

  return {
    accounts,
    trend: buildTrend(windowTweets, bucketAnchor),
    source: "x",
    capturedAt: DateTime.makeUnsafe(capturedAt),
    dataSince: DateTime.makeUnsafe(initialBackfillStart),
    followerDataSince: DateTime.makeUnsafe(firstRefreshAt)
  }
}
