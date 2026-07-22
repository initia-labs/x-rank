const DAY_MS = 1000 * 60 * 60 * 24

export interface PostingDay {
  readonly day: number
  readonly posts: number
}

export interface PostingStreaks {
  readonly current: number
  readonly longest: number
}

const dateFormatterByTimeZone = new Map<string, Intl.DateTimeFormat>()

const dateFormatter = (timeZone: string): Intl.DateTimeFormat => {
  const cached = dateFormatterByTimeZone.get(timeZone)
  if (cached) return cached
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
  dateFormatterByTimeZone.set(timeZone, formatter)
  return formatter
}

const calendarDay = (timestampMs: number, timeZone: string): number => {
  const parts = dateFormatter(timeZone).formatToParts(new Date(timestampMs))
  const year = Number(parts.find((part) => part.type === "year")?.value)
  const month = Number(parts.find((part) => part.type === "month")?.value)
  const day = Number(parts.find((part) => part.type === "day")?.value)
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS)
}

const isWorkday = (day: number): boolean => {
  const weekday = new Date(day * DAY_MS).getUTCDay()
  return weekday >= 1 && weekday <= 5
}

const nextWorkday = (day: number): number => {
  let next = day + 1
  while (!isWorkday(next)) next += 1
  return next
}

const previousWorkday = (day: number): number => {
  let previous = day - 1
  while (!isWorkday(previous)) previous -= 1
  return previous
}

export const postingDays = (timestamps: ReadonlyArray<number>, timeZone: string): ReadonlyArray<PostingDay> => {
  const postsByDay = new Map<number, number>()
  for (const timestamp of timestamps) {
    const day = calendarDay(timestamp, timeZone)
    postsByDay.set(day, (postsByDay.get(day) ?? 0) + 1)
  }
  return [...postsByDay.entries()].map(([day, posts]) => ({ day, posts })).toSorted((a, b) => a.day - b.day)
}

export const postingStreaks = (
  days: ReadonlyArray<PostingDay>,
  capturedAt: number,
  timeZone: string
): PostingStreaks => {
  const workdays = days.filter(({ day }) => isWorkday(day))
  if (workdays.length === 0) return { current: 0, longest: 0 }

  let run = 0
  let longest = 0
  let previous: number | undefined
  for (const { day } of workdays) {
    run = previous !== undefined && day === nextWorkday(previous) ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = day
  }

  const today = calendarDay(capturedAt, timeZone)
  const latest = workdays[workdays.length - 1].day
  const latestExpected = isWorkday(today) ? today : previousWorkday(today + 1)
  const graceDay = isWorkday(today) ? previousWorkday(today) : undefined
  const current = latest === latestExpected || latest === graceDay ? run : 0
  return { current, longest }
}

export const postingActivity = (
  days: ReadonlyArray<PostingDay>,
  capturedAt: number,
  timeZone: string,
  length = 91
): ReadonlyArray<{ readonly date: string; readonly posts: number }> => {
  const postsByDay = new Map(days.map(({ day, posts }) => [day, posts]))
  const today = calendarDay(capturedAt, timeZone)
  return Array.from({ length }, (_, index) => {
    const day = today - (length - 1 - index)
    return {
      date: new Date(day * DAY_MS).toISOString().slice(0, 10),
      posts: postsByDay.get(day) ?? 0
    }
  })
}
