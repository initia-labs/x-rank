import { Effect, Schema } from "effect"
import * as Atom from "effect/unstable/reactivity/Atom"
import { buildSnapshot } from "../aggregate.ts"
import { type DateRange, SocialMetricsSnapshot } from "../api.ts"
import { Dataset } from "../dataset.ts"
import { buildWindow } from "../metrics.ts"
import type { Selection } from "../selection.ts"
import type { SnapshotSource } from "./types.ts"

interface StaticManifest {
  readonly capturedAt: string
  readonly rolling: ReadonlyArray<DateRange>
  readonly weeks: ReadonlyArray<{ readonly iso: string; readonly inProgress: boolean }>
  readonly defaultWeekIso: string
}

const decodeSnapshot = Schema.decodeUnknownEffect(SocialMetricsSnapshot)
const decodeDataset = Schema.decodeUnknownEffect(Dataset)

const fetchJson = (url: string) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`${url} ${response.status}`)
      return await response.json()
    },
    catch: (cause) => new Error(`failed to load ${url}: ${cause}`)
  })

const fetchManifest: Effect.Effect<StaticManifest | undefined, never> = fetchJson("/snapshots/manifest.json").pipe(
  Effect.map((value) => value as StaticManifest),
  Effect.catch(() => Effect.succeed<StaticManifest | undefined>(undefined))
)

const snapshotUrl = (manifest: StaticManifest | undefined, selection: Selection): string => {
  if (!manifest) return "/snapshot.json"
  const suffix = selection.includeReplies ? "-with-replies" : ""
  if (selection.mode === "weekly") {
    const iso = selection.weekOf ?? manifest.defaultWeekIso
    const known = manifest.weeks.find((w) => w.iso === iso) ?? manifest.weeks[1] ?? manifest.weeks[0]
    return `/snapshots/weekly-${known?.iso ?? manifest.defaultWeekIso}${suffix}.json`
  }
  return `/snapshots/rolling-${selection.range}${suffix}.json`
}

// Fetched once, on first use of a custom range.
const datasetAtom = Atom.make(fetchJson("/snapshots/dataset.json").pipe(Effect.flatMap(decodeDataset))).pipe(
  Atom.keepAlive
)

export const staticSource: SnapshotSource = (selectionAtom) =>
  Atom.make((get) => {
    const selection = get(selectionAtom)
    if (selection.mode === "custom") {
      return Effect.map(get.result(datasetAtom), (dataset) =>
        buildSnapshot(dataset, buildWindow(selection, dataset.capturedAt), selection.includeReplies)
      )
    }
    return Effect.flatMap(fetchManifest, (manifest) =>
      fetchJson(snapshotUrl(manifest, selection)).pipe(Effect.flatMap(decodeSnapshot))
    )
  })
