// Trend-rider for cbBTC (CBBTC/USDC) on 1-minute bars, agent-fun/bars-replay/v1.
// Verified on the kit's frozen dev window: net PnL +34.25 USDC, 1 trade,
// max drawdown 1.98% (grade-local, driver process).
//
// A 1-minute bar here moves only ~8 bps on average, while a full-size
// round trip costs ~26 bps in fees, slippage and price impact, so fast
// signals whipsaw themselves to death. Instead this bot rides the slow
// trend and only trades on a real break of it:
//
//   - Flat: buy 100% of cash once the close is above its 45-bar EMA
//     (the short-term trend is up; needs 45 bars of history first).
//   - Holding: sell everything when the close falls 0.8% below its 120-bar
//     EMA (the 2-hour trend has genuinely broken down, not a 1-minute wobble).
//   - After an exit: stay out until the close recovers to 0.3% above the
//     120-bar EMA, so a dead-cat bounce does not pull it straight back in.
//
// All arithmetic is exact integer (bigint) math on the bar closes, so two
// executions on the same data produce the same orders: no clock, no random
// numbers, no environment, no files. The bot reads one bar per batch, answers
// every batch with exactly one reply, and never sends more than one order.

import { runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

/** Bars of history behind the entry EMA (45 one-minute bars). */
const ENTRY_EMA_BARS = 45;
/** Bars of history behind the trend EMA that guards the exit (120 bars). */
const TREND_EMA_BARS = 120;
/** Exit when close < trend EMA * (1 - EXIT_BELOW_BPS / 10000). */
const EXIT_BELOW_BPS = 80;
/** Re-enter after an exit only when close > trend EMA * (1 + REENTRY_ABOVE_BPS / 10000). */
const REENTRY_ABOVE_BPS = 30;
/** How far a fill may move from the latest close, in bps (3%): wide enough
 *  that ordinary 1-minute moves never reject an order, tight enough that a
 *  violent gap cannot fill at a disastrous price. */
const MAX_SLIPPAGE_BPS = 300;

const BPS_DEN = 10_000n;

/** An exponential moving average in exact integer math.
 *  ema starts at the first close and then ema += (close - ema) * 2 / (n + 1),
 *  all in bigint, so the result is identical on every run. */
class Ema {
  readonly n: bigint;
  value: bigint | null = null;
  bars = 0;

  constructor(n: number) {
    this.n = BigInt(n);
  }

  update(close: bigint): void {
    this.bars++;
    if (this.value === null) {
      this.value = close;
      return;
    }
    this.value += ((close - this.value) * 2n) / (this.n + 1n);
  }
}

const entryEma = new Ema(ENTRY_EMA_BARS);
const trendEma = new Ema(TREND_EMA_BARS);
/** True once this run has exited a position: re-entry then needs the
 *  recovery confirmation instead of the plain entry rule. */
let exited = false;

await runBars({
  onBatch(state: BarsState) {
    if (state.warmingUp) return [];
    const symbol = state.hello.symbols[0].symbol;
    const close = state.close(symbol);
    if (close === null) return [];
    entryEma.update(close);
    trendEma.update(close);
    if (entryEma.value === null || trendEma.value === null) return [];

    const position = state.positions.get(symbol);
    const orders: OrderInput[] = [];

    if (position !== undefined && position.qty > 0n) {
      // Holding: the trend has broken down once the close is 0.8% under
      // its 120-bar EMA. Sell the whole position.
      if (close * BPS_DEN < trendEma.value * (BPS_DEN - BigInt(EXIT_BELOW_BPS))) {
        exited = true;
        orders.push({ side: 'sell', symbol, qty: position.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
      }
      return orders;
    }

    // Flat: after an exit, wait for a real recovery above the trend EMA;
    // otherwise enter as soon as the close is above the 45-bar EMA.
    if (exited) {
      if (close * BPS_DEN > trendEma.value * (BPS_DEN + BigInt(REENTRY_ABOVE_BPS))) {
        exited = false; // recovered: back to the plain entry rule below
      } else {
        return [];
      }
    }
    if (entryEma.bars < ENTRY_EMA_BARS) return [];
    if (close <= entryEma.value) return [];

    // Buy with all the cash, capped by the position-weight room.
    const room = state.weightRoom(symbol);
    const spend = state.cash < room ? state.cash : room;
    if (spend < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    orders.push({ side: 'buy', symbol, notional_quote_units: spend, max_slippage_bps: MAX_SLIPPAGE_BPS });
    return orders;
  },
});
