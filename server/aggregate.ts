import { Effect } from "effect"
import { buildSnapshot } from "../src/aggregate.ts"
import type { SocialMetricsSnapshot } from "../src/api.ts"
import type { Dataset, DatasetAccount, FollowerPoint } from "../src/dataset.ts"
import type { WindowSpec } from "../src/metrics.ts"
import { accountByHandle, accountConfigs } from "./config.ts"
import {
  allFollowerHistorySince,
  earliestFollowersAll,
  firstRefresh,
  listAccounts,
  tweetsAcrossAccountsBetween,
  type DbClient
} from "./db.ts"
import { normalizeHandle } from "./handles.ts"

const rosterAccounts = (db: DbClient): Effect.Effect<ReadonlyArray<DatasetAccount>> =>
  Effect.gen(function* () {
    const accounts = yield* listAccounts(db)
    const rows = new Map(accounts.map((row) => [normalizeHandle(row.handle), row]))
    return accountConfigs.flatMap((cfg) => {
      const row = rows.get(normalizeHandle(cfg.handle))
      if (!row) return []
      const timeZone = accountByHandle.get(normalizeHandle(row.handle))?.timeZone ?? "UTC"
      return [
        {
          id: row.id,
          handle: row.handle,
          name: row.name,
          team: row.team,
          color: row.color,
          profile_image_url: row.profile_image_url,
          timeZone
        }
      ]
    })
  })

export const loadDataset = (db: DbClient, capturedAt: number): Effect.Effect<Dataset> =>
  Effect.gen(function* () {
    const [accounts, tweets, followerHistory, earliestFollowers, first] = yield* Effect.all(
      [
        rosterAccounts(db),
        tweetsAcrossAccountsBetween(db, 0, capturedAt),
        allFollowerHistorySince(db, 0),
        earliestFollowersAll(db),
        firstRefresh(db)
      ],
      { concurrency: "unbounded" }
    )
    return {
      capturedAt,
      firstRefreshAt: first?.captured_at ?? capturedAt,
      accounts,
      tweets,
      followerHistory: Object.fromEntries(followerHistory) as Record<string, ReadonlyArray<FollowerPoint>>,
      earliestFollowers: Object.fromEntries(earliestFollowers)
    }
  })

export const snapshotFor = (
  db: DbClient,
  window: WindowSpec,
  capturedAt: number,
  includeReplies = false
): Effect.Effect<SocialMetricsSnapshot> =>
  Effect.map(loadDataset(db, capturedAt), (dataset) => buildSnapshot(dataset, window, includeReplies))
