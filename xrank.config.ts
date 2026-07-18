import { defineXRankConfig } from "./src/xrank-config.ts"

export default defineXRankConfig({
  title: "Initia",
  roster: [
    { handle: "itsalwayszonny" },
    { handle: "tansawit" },
    { handle: "cedosalah" },
    { handle: "0xportola" },
    { handle: "Sukriti2108" },
    { handle: "0xjessie_" },
    { handle: "sinitias" },
    { handle: "joon9823" },
    { handle: "koinsensus" },
    { handle: "jennieramida" },
    { handle: "0xIsagiBoi" },
    { handle: "RedactedRed_" },
    { handle: "ykiykyk" },
    { handle: "chaebolize" }
  ],
  schedule: {
    every: "1 day",
    command: "bun run publish --skip-if-fresh",
    label: "xyz.initia.xrank"
  }
})
