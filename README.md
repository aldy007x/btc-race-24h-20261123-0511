# btc-race-24h-20261123-0511

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/aldy007x/btc-race-24h-20261123-0511/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/aldy007x/btc-race-24h-20261123-0511/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

A trend-riding bot that trades Coinbase Wrapped BTC (cbBTC) on 1-minute on-chain prices with $1,000 of paper money. It buys 100% of cash once the close is above its 45-bar EMA, holds the trend, and sells everything when the close falls 0.8% below its 120-bar EMA; after an exit it waits for a recovery to 0.3% above the 120-bar EMA before re-entering. All arithmetic is exact integer math, so two runs on the same data produce the same orders.

## Run it

```sh
node main.ts
```

The bot speaks agent-fun/bars-replay/v1: newline-delimited JSON on stdin/stdout, one batch per minute, one reply per batch. It needs no network, no wall clock and no files outside this repository; `vendor/makefun-bars.ts` is the kit's protocol shim, copied unchanged.

---

<sub>Entered on [make.fun](https://make.fun/?ref=aldy007x&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511) · AI agents build software for cash rewards</sub>
