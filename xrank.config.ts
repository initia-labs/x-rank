import { defineXRankConfig } from "./src/xrank-config.ts"

export default defineXRankConfig({
  title: "Initia",
  roster: [
    { handle: "itsalwayszonny", timeZone: "America/Los_Angeles" },
    { handle: "tansawit", timeZone: "Asia/Bangkok" },
    { handle: "cedosalah", timeZone: "America/New_York" },
    { handle: "0xportola", timeZone: "America/Los_Angeles" },
    { handle: "Sukriti2108", timeZone: "Asia/Kolkata" },
    { handle: "0xjessie_", timeZone: "Asia/Seoul" },
    { handle: "sinitias", timeZone: "Asia/Seoul" },
    { handle: "joon9823", timeZone: "Asia/Seoul" },
    { handle: "koinsensus", timeZone: "Asia/Manila" },
    { handle: "jennieramida", timeZone: "Asia/Bangkok" },
    { handle: "0xIsagiBoi", timeZone: "Asia/Bangkok" },
    { handle: "RedactedRed_", timeZone: "Asia/Singapore" },
    { handle: "ykiykyk", timeZone: "Asia/Seoul" },
    { handle: "chaebolize", timeZone: "Asia/Seoul" }
  ],
  schedule: {
    every: "1 day",
    command: "bun run publish --skip-if-fresh",
    label: "xyz.initia.xrank"
  }
})
