# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Preview production build
```

## Project Overview

A React monitoring dashboard for **FCN（固定配息連結股票結構型商品）** — structured products that pay fixed coupons and are linked to a basket of equities. The dashboard tracks KI (Knock-In) and KO (Knock-Out) barrier events across multiple contracts.

The app is designed to work both as a **Claude Artifact** (using `window.storage`) and as a standalone local Vite app (falls back to `localStorage`).

## Architecture

Everything lives in one file: **`src/App.jsx`**. There is no router, no state library, and no external component library — just React + Tailwind.

### Data Flow

1. On mount, `App` reads contracts from storage (`fcn-contracts`) and price cache (`fcn-prices`).
2. If storage is empty, two seed contracts are written automatically.
3. If the price cache is absent or older than 4 hours, `doRefresh()` fires automatically.
4. `doRefresh()` fetches current prices from Yahoo Finance (via corsproxy.io) and exchange rates from frankfurter.app, then writes the result back to storage under `fcn-prices`.
5. Status (`KI` / `KO` / `NEAR_KI` / `OK`) is derived on every render via `calcStatus()` — it is never stored.

### Key Design Choices

**`contractsRef`** — `doRefresh` has no dependencies (`useCallback(async fn, [])`). Instead of putting `contracts` in its dependency array (which would cause re-creation on every contract change), the current contracts are accessed via a `useRef` that is kept in sync with state. When saving, the ref is updated synchronously inside the `setContracts` updater before the 80ms `setTimeout(() => doRefresh())` fires.

**Price fetching** uses `Promise.allSettled` so a single bad ticker doesn't abort the whole update — failed tickers get `{ price: null, currency: null }` and show `—` in the UI.

**Modal** — `modal` state is `undefined` (closed), `null` (new contract), or a contract object (edit mode). No HTML `<form>` tag; all submission goes through `onClick` on the save button.

### Storage Keys

| Key | Type | Description |
|-----|------|-------------|
| `fcn-contracts` | `Contract[]` | All contracts |
| `fcn-prices` | `PriceCache` | Current prices + exchange rates, cached for 4h |

### Data Structures

**Contract:**
```js
{
  id, kiMechanism,          // "AKI" | "EKI"
  broker, productName, productCode,
  tradeDate, issueDate, firstObserveDate, observeEndDate, maturityDate,
  principalAmount, principalCurrency,   // "USD" | "JPY"
  koRatio, kiRatio, strikeRatio,        // ratios applied to referencePrice
  couponRate, couponFrequency,          // "monthly" | "quarterly"
  underlyings: [{
    ticker, market,                     // "US" | "JP" (auto-detected: .T suffix = JP)
    referencePrice,                     // closing price on issueDate (fetched once, stored)
    koPrice, kiPrice, strikePrice,      // = referencePrice × ratio (stored, not recalculated)
  }]
}
```

**PriceCache:**
```js
{
  lastUpdated,                          // ISO timestamp
  rates: { USD_TWD, JPY_TWD },
  prices: { [ticker]: { price, currency } }
}
```

### KI / KO Logic (`calcStatus`)

```
observationActive = firstObserveDate <= today <= observeEndDate

KI triggered if observationActive AND:
  - AKI: any underlying currentPrice <= kiPrice
  - EKI: today == observeEndDate AND any underlying currentPrice <= kiPrice

KO triggered if observationActive AND ALL underlyings currentPrice >= koPrice

Priority: KI > KO > NEAR_KI (any < 10% above kiPrice) > OK
```

## External APIs

| Service | URL pattern | Key required |
|---------|-------------|--------------|
| Yahoo Finance (current) | `corsproxy.io → query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=1d` | No |
| Yahoo Finance (historical) | same endpoint with `period1`/`period2` Unix timestamps | No |
| Exchange rates | `api.frankfurter.app/latest?from=USD&to=TWD` | No |

Japanese stocks use `.T` suffix (e.g., `7203.T`). Prices display with `¥` / `$` prefix.

## UI Structure

- **Sticky header**: contract counts per status, last-updated time, refresh button, add button.
- **Currency toggle** (top-right of table): switches coupon display between original currency and TWD (using live rates; does not affect stored data).
- **Table rows** are clickable to expand. Expanded rows show a per-underlying detail table with reference price, KO/KI/strike prices, current price, and distance percentages.
- **ContractModal**: full-screen overlay for add/edit. On save, `fetchHistorical` is called for any underlying that lacks a `referencePrice`. Delete requires two clicks (confirm step).
