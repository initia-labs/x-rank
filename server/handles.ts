export const normalizeHandle = (handle: string): string => handle.replace(/^@/, "").toLowerCase()

export const searchCursorKey = (handle: string): string => `search_newest_id:v2:${normalizeHandle(handle)}`
