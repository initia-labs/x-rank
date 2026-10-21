import { FetchHttpClient } from "effect/unstable/http"
import * as Atom from "effect/unstable/reactivity/Atom"
import * as AtomHttpApi from "effect/unstable/reactivity/AtomHttpApi"
import { SnapshotApi } from "../api.ts"
import type { Selection } from "../selection.ts"
import type { SnapshotSource } from "./types.ts"

export class SnapshotApiClient extends AtomHttpApi.Service<SnapshotApiClient>()("SnapshotApiClient", {
  api: SnapshotApi,
  httpClient: FetchHttpClient.layer
}) {}

const windowKey = (selection: Selection): string => {
  if (selection.mode === "weekly") return `weekly:${selection.weekOf ?? "latest"}`
  if (selection.mode === "custom") return `custom:${selection.from ?? ""}:${selection.to ?? ""}`
  return `rolling:${selection.range}`
}

const queryKey = (selection: Selection): string =>
  `${windowKey(selection)}:${selection.includeReplies ? "replies" : "originals"}`

export const liveSource: SnapshotSource = (selectionAtom) =>
  Atom.make((get) => {
    const selection = get(selectionAtom)
    return get(
      SnapshotApiClient.query("snapshot", "getSnapshot", {
        query: {
          range: selection.range,
          mode: selection.mode,
          weekOf: selection.weekOf,
          from: selection.from,
          to: selection.to,
          includeReplies: selection.includeReplies
        },
        serializationKey: queryKey(selection)
      })
    )
  })
