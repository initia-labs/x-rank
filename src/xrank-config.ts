export interface RosterEntry {
  readonly handle: string
  readonly team?: string
  readonly color?: `#${string}`
  readonly timeZone?: string
}

export interface ScheduleConfig {
  readonly every?: string
  readonly command?: string
  readonly label?: string
}

export interface XRankConfig {
  readonly title?: string
  readonly roster: ReadonlyArray<RosterEntry>
  readonly schedule?: ScheduleConfig
}

export const defineXRankConfig = <const Config extends XRankConfig>(config: Config): Config => config

export const isValidTimeZone = (timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format()
    return true
  } catch {
    return false
  }
}
