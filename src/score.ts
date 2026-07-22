import type { Account, ScoreMetric } from "./api.ts"
import type { MetricSnapshot } from "./model.ts"

export interface ScoreDefinition {
  readonly key: ScoreMetric
  readonly label: string
  readonly unit: string
  readonly description: string
  readonly value: (snapshot: MetricSnapshot, account: Account) => number
}

export const scores: Record<ScoreMetric, ScoreDefinition> = {
  posts: {
    key: "posts",
    label: "Tweets / week",
    unit: "tweets per week",
    description: "Average included tweets per seven days in the selected window",
    value: ({ weeklyPosts }) => weeklyPosts
  },
  streak: {
    key: "streak",
    label: "Workday streak",
    unit: "consecutive workdays",
    description: "Consecutive local Monday–Friday posting days; weekends never break the streak",
    value: (_, account) => account.currentPostingStreak
  },
  engagements: {
    key: "engagements",
    label: "Engagements",
    unit: "total engagements",
    description: "Total likes, replies, reposts, quotes, and bookmarks",
    value: ({ engagements }) => engagements
  },
  impressions: {
    key: "impressions",
    label: "Impressions",
    unit: "total impressions",
    description: "Total impressions (views) across all posts in the window",
    value: ({ stats }) => stats.impressions
  }
}

export const scoreFor = (key: ScoreMetric): ScoreDefinition => scores[key]
