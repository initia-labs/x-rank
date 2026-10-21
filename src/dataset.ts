import { Schema } from "effect"

export const DatasetTweet = Schema.Struct({
  id: Schema.String,
  account_id: Schema.String,
  created_at: Schema.Number,
  text: Schema.String,
  url: Schema.String,
  likes: Schema.Number,
  replies: Schema.Number,
  reposts: Schema.Number,
  quotes: Schema.Number,
  bookmarks: Schema.Number,
  impressions: Schema.Number,
  is_reply: Schema.Number
})
export type DatasetTweet = Schema.Schema.Type<typeof DatasetTweet>

export const DatasetAccount = Schema.Struct({
  id: Schema.String,
  handle: Schema.String,
  name: Schema.String,
  team: Schema.String,
  color: Schema.String,
  profile_image_url: Schema.NullOr(Schema.String),
  timeZone: Schema.String
})
export type DatasetAccount = Schema.Schema.Type<typeof DatasetAccount>

export const FollowerPoint = Schema.Struct({
  captured_at: Schema.Number,
  followers: Schema.Number
})
export type FollowerPoint = Schema.Schema.Type<typeof FollowerPoint>

/** Everything needed to build a snapshot for any window, so the static site can serve custom ranges. */
export const Dataset = Schema.Struct({
  capturedAt: Schema.Number,
  firstRefreshAt: Schema.Number,
  /** Roster order. */
  accounts: Schema.Array(DatasetAccount),
  /** Newest first. */
  tweets: Schema.Array(DatasetTweet),
  /** Oldest first per account. */
  followerHistory: Schema.Record(Schema.String, Schema.Array(FollowerPoint)),
  earliestFollowers: Schema.Record(Schema.String, Schema.Number)
})
export type Dataset = Schema.Schema.Type<typeof Dataset>
