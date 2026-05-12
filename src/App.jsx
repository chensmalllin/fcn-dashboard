import { useState, useEffect, useCallback, useRef } from "react";

// ══════════════════════════════════════════════════════════════════
// Storage  (window.storage for Claude Artifacts, localStorage fallback)
// ══════════════════════════════════════════════════════════════════

function sGet(key) {
  try {
    const v = (window.storage ?? localStorage).getItem(key);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}
function sSet(key, val) {
  try { (window.storage ?? localStorage).setItem(key, JSON.stringify(val)); } catch {}
}

// ══════════════════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════════════════

const CONTRACTS_KEY = "fcn-contracts";
const PRICES_KEY    = "fcn-prices";
const CACHE_TTL     = 4 * 60 * 60 * 1000;

// ══════════════════════════════════════════════════════════════════
// Seed Data
// ══════════════════════════════════════════════════════════════════

const SEEDS = [
  {"id":"XS3108807952","kiMechanism":"EKI","broker":"凱基證券","productName":"BBVA 9個月期美元計價自動提前贖回連結一籃子股票結構型商品品(XS3108807952)(USD)","productCode":"XS3108807952","tradeDate":"2025-09-12","issueDate":"2025-09-19","firstObserveDate":"2025-10-21","observeEndDate":"2026-06-22","maturityDate":"2026-06-24","principalAmount":10000,"principalCurrency":"USD","koRatio":1,"kiRatio":0.65,"strikeRatio":0.75,"couponRate":0.15,"couponFrequency":"monthly","underlyings":[{"ticker":"AVGO","market":"US","referencePrice":359.87,"koPrice":359.87,"kiPrice":233.9155,"strikePrice":269.9025},{"ticker":"META","market":"US","referencePrice":755.59,"koPrice":755.59,"kiPrice":491.13,"strikePrice":566.6925},{"ticker":"NVDA","market":"US","referencePrice":177.82,"koPrice":177.82,"kiPrice":115.583,"strikePrice":133.365},{"ticker":"TSLA","market":"US","referencePrice":395.94,"koPrice":395.94,"kiPrice":257.361,"strikePrice":296.955}]},
  {"id":"XS3229791341","kiMechanism":"EKI","broker":"凱基證券","productName":"法國外貿銀行5個月美元計價固定配息(自動提前到期)連結一籃子標的結構型商品(不保本、無擔保及無保證機構) EQD-S05-102376","productCode":"XS3229791341","tradeDate":"2026-01-12","issueDate":"2026-01-20","firstObserveDate":"2026-02-20","observeEndDate":"2026-06-22","maturityDate":"2026-06-25","principalAmount":10000,"principalCurrency":"USD","koRatio":0.98,"kiRatio":0.65,"strikeRatio":0.75,"couponRate":0.1748,"couponFrequency":"monthly","underlyings":[{"ticker":"AVGO","market":"US","referencePrice":351.3061,"koPrice":344.28,"kiPrice":228.35,"strikePrice":263.4796},{"ticker":"MU","market":"US","referencePrice":345.0102,"koPrice":338.11,"kiPrice":224.26,"strikePrice":258.7577},{"ticker":"NVDA","market":"US","referencePrice":185.1224,"koPrice":181.42,"kiPrice":120.33,"strikePrice":138.8418},{"ticker":"TSLA","market":"US","referencePrice":448.7449,"koPrice":439.77,"kiPrice":291.69,"strikePrice":336.5587}]},
  {"id":"XS3246579679","kiMechanism":"AKI","broker":"凱基證券","productName":"法國外貿銀行6個月美元計價固定配息(自動提前到期)連結一籃子標的結構型商品EQD-S05-102575","productCode":"XS3246579679","tradeDate":"2026-01-28","issueDate":"2026-02-04","firstObserveDate":"2026-03-05","observeEndDate":"2026-08-04","maturityDate":"2026-08-07","principalAmount":20000,"principalCurrency":"USD","koRatio":1,"kiRatio":0.65,"strikeRatio":0.8,"couponRate":0.252,"couponFrequency":"monthly","underlyings":[{"ticker":"APP","market":"US","referencePrice":542.36,"koPrice":542.36,"kiPrice":352.534,"strikePrice":433.888},{"ticker":"MRVL","market":"US","referencePrice":83.62,"koPrice":83.62,"kiPrice":54.353,"strikePrice":66.896},{"ticker":"TSLA","market":"US","referencePrice":431.46,"koPrice":431.46,"kiPrice":280.449,"strikePrice":345.168}]},
  {"id":"XS3342791467","kiMechanism":"EKI","broker":"凱基證券","productName":"法國外貿銀行9個月連結股權結構型商品","productCode":"XS3342791467","tradeDate":"2026-04-21","issueDate":"2026-04-28","firstObserveDate":"2026-06-29","observeEndDate":"2027-01-28","maturityDate":"2027-02-02","principalAmount":10000,"principalCurrency":"USD","koRatio":1,"kiRatio":0.5,"strikeRatio":0.65,"couponRate":0.19,"couponFrequency":"monthly","underlyings":[{"ticker":"MU","market":"US","referencePrice":449.38,"koPrice":449.38,"kiPrice":224.69,"strikePrice":292.097},{"ticker":"NVDA","market":"US","referencePrice":199.88,"koPrice":199.88,"kiPrice":99.94,"strikePrice":129.922},{"ticker":"TSM","market":"US","referencePrice":368.08,"koPrice":368.08,"kiPrice":184.04,"strikePrice":239.252}]},
  {"id":"XS3347422373","kiMechanism":"EKI","broker":"凱基證券","productName":"HSBC6個月連結股權結構型商品","productCode":"XS3347422373","tradeDate":"2026-04-30","issueDate":"2026-05-12","firstObserveDate":"2026-06-12","observeEndDate":"2026-11-12","maturityDate":"2026-11-17","principalAmount":3000000,"principalCurrency":"JPY","koRatio":1,"kiRatio":0.65,"strikeRatio":0.75,"couponRate":0.2509,"couponFrequency":"monthly","underlyings":[{"ticker":"6857.T","market":"JP","referencePrice":28260,"koPrice":28260,"kiPrice":18369,"strikePrice":21195},{"ticker":"7011.T","market":"JP","referencePrice":4615,"koPrice":4615,"kiPrice":2999.75,"strikePrice":3461.25},{"ticker":"9984.T","market":"JP","referencePrice":5219,"koPrice":5219,"kiPrice":3392.5,"strikePrice":3914.25}]},
  {"id":"SNCAELN00012","kiMechanism":"EKI","broker":"元大證券","productName":"Crédit Agricole CIB Financial Solutions 8個月美元計價固定配息自動提前出場結構型商品(無擔保)(不保本)XS3195284073","productCode":"SNCAELN00012","tradeDate":"2025-12-09","issueDate":"2025-12-16","firstObserveDate":"2026-02-17","observeEndDate":"2026-08-17","maturityDate":"2026-08-19","principalAmount":10000,"principalCurrency":"USD","koRatio":1,"kiRatio":0.6,"strikeRatio":0.7,"couponRate":0.2199,"couponFrequency":"monthly","underlyings":[{"ticker":"APP","market":"US","referencePrice":724.62,"koPrice":724.62,"kiPrice":434.77,"strikePrice":507.234},{"ticker":"AVGO","market":"US","referencePrice":406.29,"koPrice":406.29,"kiPrice":243.77,"strikePrice":284.403},{"ticker":"PLTR","market":"US","referencePrice":181.84,"koPrice":181.84,"kiPrice":109.1,"strikePrice":127.288},{"ticker":"TSLA","market":"US","referencePrice":445.17,"koPrice":445.17,"kiPrice":267.1,"strikePrice":311.619}]},
  {"id":"SNUBSELN01036","kiMechanism":"EKI","broker":"元大證券","productName":"瑞銀 8個月美元計價定期觀察記憶式提前出場固定配息連結股票（不保本）（含觸及下限價事件）","productCode":"SNUBSELN01036","tradeDate":"2025-12-26","issueDate":"2026-01-05","firstObserveDate":"2026-02-06","observeEndDate":"2026-09-08","maturityDate":"2026-09-11","principalAmount":10000,"principalCurrency":"USD","koRatio":1.05,"kiRatio":0.6,"strikeRatio":0.75,"couponRate":0.2178,"couponFrequency":"monthly","underlyings":[{"ticker":"APP","market":"US","referencePrice":714.2286,"koPrice":749.94,"kiPrice":428.54,"strikePrice":535.6715},{"ticker":"MU","market":"US","referencePrice":284.7905,"koPrice":299.03,"kiPrice":170.88,"strikePrice":213.5929},{"ticker":"NVDA","market":"US","referencePrice":190.5333,"koPrice":200.06,"kiPrice":114.32,"strikePrice":142.9},{"ticker":"TSLA","market":"US","referencePrice":475.1905,"koPrice":498.95,"kiPrice":285.124,"strikePrice":356.3929}]},
  {"id":"SNCGELN00617","kiMechanism":"AKI","broker":"元大證券","productName":"CGMHI 6個月美元計價(記憶式自動提前出場)連結一籃子連結標的中表現最差並由花旗集團保證之固定配息結構型商品(無擔保)(不保本)XS3136578849","productCode":"SNCGELN00617","tradeDate":"2026-01-09","issueDate":"2026-01-16","firstObserveDate":"2026-02-17","observeEndDate":"2026-07-16","maturityDate":"2026-07-21","principalAmount":10000,"principalCurrency":"USD","koRatio":1,"kiRatio":0.55,"strikeRatio":0.85,"couponRate":0.2463,"couponFrequency":"monthly","underlyings":[{"ticker":"MU","market":"US","referencePrice":345.09,"koPrice":345.09,"kiPrice":189.8,"strikePrice":293.3265},{"ticker":"NVDA","market":"US","referencePrice":184.86,"koPrice":184.86,"kiPrice":101.67,"strikePrice":157.131},{"ticker":"TSLA","market":"US","referencePrice":445.01,"koPrice":445.01,"kiPrice":244.76,"strikePrice":378.2585}]},
  {"id":"SNCGELN00651","kiMechanism":"AKI","broker":"元大證券","productName":"CGMHI 12個月美元計價(記憶式自動提前出場)連結一籃子連結標的中表現最差並由花旗集團保證之固定配息結構型商品(無擔保)(不保本)","productCode":"SNCGELN00651","tradeDate":"2026-03-06","issueDate":"2026-03-13","firstObserveDate":"2026-05-14","observeEndDate":"2027-03-15","maturityDate":"2027-03-18","principalAmount":10000,"principalCurrency":"USD","koRatio":1.1,"kiRatio":0.65,"strikeRatio":0.8,"couponRate":0.162,"couponFrequency":"monthly","underlyings":[{"ticker":"NVDA","market":"US","referencePrice":177.82,"koPrice":195.602,"kiPrice":115.583,"strikePrice":142.256},{"ticker":"TSM","market":"US","referencePrice":338.89,"koPrice":372.779,"kiPrice":220.2785,"strikePrice":271.112}]},
  {"id":"SNNOELN01572","kiMechanism":"EKI","broker":"元大證券","productName":"野村發行６個月美元計價固定配息(記憶式自動提前出場)連結一籃子股","productCode":"SNNOELN01572","tradeDate":"2026-04-17","issueDate":"2026-04-24","firstObserveDate":"2026-05-27","observeEndDate":"2026-10-26","maturityDate":"2026-10-28","principalAmount":10000,"principalCurrency":"USD","koRatio":1.05,"kiRatio":0.55,"strikeRatio":0.7,"couponRate":0.2455,"couponFrequency":"monthly","underlyings":[{"ticker":"AMD","market":"US","referencePrice":278.39,"koPrice":292.3095,"kiPrice":153.1145,"strikePrice":194.873},{"ticker":"INTC","market":"US","referencePrice":68.5,"koPrice":71.925,"kiPrice":37.675,"strikePrice":47.95},{"ticker":"MU","market":"US","referencePrice":455.07,"koPrice":477.8235,"kiPrice":250.2885,"strikePrice":318.549},{"ticker":"NVDA","market":"US","referencePrice":201.68,"koPrice":211.764,"kiPrice":110.924,"strikePrice":141.176},{"ticker":"TSM","market":"US","referencePrice":370.5,"koPrice":389.025,"kiPrice":203.775,"strikePrice":259.35}]},
  {"id":"SNGSELN01458","kiMechanism":"EKI","broker":"元大證券","productName":"6個月英商高盛國際公司美元計價固定配息記憶式自動提前出場股權連結結構型商品（無擔保）","productCode":"SNGSELN01458","tradeDate":"2026-04-22","issueDate":"2026-04-29","firstObserveDate":"2026-06-01","observeEndDate":"2026-10-29","maturityDate":"2026-11-02","principalAmount":10000,"principalCurrency":"USD","koRatio":1.05,"kiRatio":0.6,"strikeRatio":0.75,"couponRate":0.23868,"couponFrequency":"monthly","underlyings":[{"ticker":"AMD","market":"US","referencePrice":303.46,"koPrice":318.633,"kiPrice":182.076,"strikePrice":227.595},{"ticker":"ARM","market":"US","referencePrice":196.57,"koPrice":206.3985,"kiPrice":117.942,"strikePrice":147.4275},{"ticker":"MU","market":"US","referencePrice":487.48,"koPrice":511.854,"kiPrice":292.488,"strikePrice":365.61},{"ticker":"NVDA","market":"US","referencePrice":202.5,"koPrice":212.625,"kiPrice":121.5,"strikePrice":151.875},{"ticker":"TSM","market":"US","referencePrice":387.44,"koPrice":406.812,"kiPrice":232.464,"strikePrice":290.58}]},
  {"id":"SNGSELN01464","kiMechanism":"EKI","broker":"元大證券","productName":"6個月英商高盛國際公司美元計價固定配息記憶式自動提前出場股權連結結構型商品（無擔保）（不保本）","productCode":"SNGSELN01464","tradeDate":"2026-04-23","issueDate":"2026-04-30","firstObserveDate":"2026-06-02","observeEndDate":"2026-10-30","maturityDate":"2026-11-03","principalAmount":10000,"principalCurrency":"USD","koRatio":1.05,"kiRatio":0.6,"strikeRatio":0.7,"couponRate":0.23724,"couponFrequency":"monthly","underlyings":[{"ticker":"AMD","market":"US","referencePrice":305.33,"koPrice":320.5965,"kiPrice":183.198,"strikePrice":213.731},{"ticker":"ARM","market":"US","referencePrice":204.61,"koPrice":214.8405,"kiPrice":122.766,"strikePrice":143.227},{"ticker":"AVGO","market":"US","referencePrice":419.94,"koPrice":440.937,"kiPrice":251.964,"strikePrice":293.958},{"ticker":"MU","market":"US","referencePrice":481.72,"koPrice":505.806,"kiPrice":289.032,"strikePrice":337.204},{"ticker":"TSM","market":"US","referencePrice":382.66,"koPrice":401.793,"kiPrice":229.596,"strikePrice":267.862}]},
  {"id":"SNDBSELN00447","kiMechanism":"EKI","broker":"元大證券","productName":"星展銀行9個月期美元計價固定利率記憶型自動提前出場及下限觸發一籃","productCode":"SNDBSELN00447","tradeDate":"2026-04-28","issueDate":"2026-05-06","firstObserveDate":"2026-06-09","observeEndDate":"2027-02-08","maturityDate":"2027-02-10","principalAmount":10000,"principalCurrency":"USD","koRatio":1,"kiRatio":0.6,"strikeRatio":0.7,"couponRate":0.2444,"couponFrequency":"monthly","underlyings":[{"ticker":"AMD","market":"US","referencePrice":323.21,"koPrice":323.21,"kiPrice":193.926,"strikePrice":226.247},{"ticker":"AVGO","market":"US","referencePrice":399.83,"koPrice":399.83,"kiPrice":239.898,"strikePrice":279.881},{"ticker":"INTC","market":"US","referencePrice":84.52,"koPrice":84.52,"kiPrice":50.712,"strikePrice":59.164},{"ticker":"ORCL","market":"US","referencePrice":165.96,"koPrice":165.96,"kiPrice":99.576,"strikePrice":116.172}]},
  {"id":"SNGSELN01506","kiMechanism":"AKI","broker":"元大證券","productName":"4個月英商高盛國際公司美元計價固定配息記憶式自動提前出場股權連結結構型商品","productCode":"SNGSELN01506","tradeDate":"2026-05-06","issueDate":"2026-05-13","firstObserveDate":"2026-06-16","observeEndDate":"2026-09-14","maturityDate":"2026-09-16","principalAmount":10000,"principalCurrency":"USD","koRatio":1,"kiRatio":0.6,"strikeRatio":0.75,"couponRate":0.1914,"couponFrequency":"monthly","underlyings":[{"ticker":"MRVL","market":"US","referencePrice":172.15,"koPrice":172.15,"kiPrice":103.29,"strikePrice":129.1125},{"ticker":"NVDA","market":"US","referencePrice":207.83,"koPrice":207.83,"kiPrice":124.698,"strikePrice":155.8725},{"ticker":"TSM","market":"US","referencePrice":419.5,"koPrice":419.5,"kiPrice":251.7,"strikePrice":314.625}]},
  {"id":"import-16","kiMechanism":"EKI","broker":"元大證券","productName":"","productCode":"import-16","tradeDate":"2026-05-07","issueDate":"2026-05-13","firstObserveDate":"2026-06-16","observeEndDate":"2026-09-15","maturityDate":"2026-09-17","principalAmount":20000,"principalCurrency":"USD","koRatio":0.9,"kiRatio":0.5,"strikeRatio":0.7,"couponRate":0.2428,"couponFrequency":"monthly","underlyings":[{"ticker":"LITE","market":"US","referencePrice":0,"koPrice":0,"kiPrice":0,"strikePrice":0},{"ticker":"MU","market":"US","referencePrice":0,"koPrice":0,"kiPrice":0,"strikePrice":0}]},
  {"id":"024S0790","kiMechanism":"EKI","broker":"中國信託","productName":"SGISSUERE日圓計價12個月固定配息股權連結結構債","productCode":"024S0790","tradeDate":"2025-11-13","issueDate":"2025-11-20","firstObserveDate":"2026-02-20","observeEndDate":"2026-11-20","maturityDate":"2026-11-27","principalAmount":10000000,"principalCurrency":"JPY","koRatio":1,"kiRatio":0.6,"strikeRatio":0.75,"couponRate":0.1603,"couponFrequency":"monthly","underlyings":[{"ticker":"AAL","market":"US","referencePrice":13.07,"koPrice":13.07,"kiPrice":7.84,"strikePrice":9.8025},{"ticker":"AMD","market":"US","referencePrice":247.96,"koPrice":247.96,"kiPrice":148.77,"strikePrice":185.97},{"ticker":"MRVL","market":"US","referencePrice":87.52,"koPrice":87.52,"kiPrice":52.51,"strikePrice":65.64},{"ticker":"ORCL","market":"US","referencePrice":217.57,"koPrice":217.57,"kiPrice":130.54,"strikePrice":163.1775}]},
  {"id":"012S1306","kiMechanism":"EKI","broker":"中國信託","productName":"","productCode":"012S1306","tradeDate":"2026-05-08","issueDate":"2026-05-15","firstObserveDate":"2026-06-15","observeEndDate":"2026-12-15","maturityDate":"2026-12-17","principalAmount":50000,"principalCurrency":"USD","koRatio":1,"kiRatio":0,"strikeRatio":0.7,"couponRate":0.1989,"couponFrequency":"monthly","underlyings":[{"ticker":"MRVL","market":"US","referencePrice":0,"koPrice":0,"kiPrice":0,"strikePrice":0},{"ticker":"NVDA","market":"US","referencePrice":0,"koPrice":0,"kiPrice":0,"strikePrice":0},{"ticker":"TSM","market":"US","referencePrice":0,"koPrice":0,"kiPrice":0,"strikePrice":0}]},
  {"id":"016S1468","kiMechanism":"EKI","broker":"中國信託","productName":"","productCode":"016S1468","tradeDate":"2026-05-07","issueDate":"2026-05-14","firstObserveDate":"2026-06-14","observeEndDate":"2027-05-14","maturityDate":"2027-05-18","principalAmount":50000,"principalCurrency":"USD","koRatio":1,"kiRatio":0.6,"strikeRatio":0.7,"couponRate":0.1812,"couponFrequency":"monthly","underlyings":[{"ticker":"GOOGL","market":"US","referencePrice":0,"koPrice":0,"kiPrice":0,"strikePrice":0},{"ticker":"MU","market":"US","referencePrice":0,"koPrice":0,"kiPrice":0,"strikePrice":0},{"ticker":"TSM","market":"US","referencePrice":0,"koPrice":0,"kiPrice":0,"strikePrice":0}]},
];

// ══════════════════════════════════════════════════════════════════
// API
// ══════════════════════════════════════════════════════════════════

async function fetchPrice(ticker) {
  const r = await fetch(`/api/price?ticker=${encodeURIComponent(ticker)}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function fetchHistorical(ticker, dateStr) {
  const r = await fetch(`/api/historical?ticker=${encodeURIComponent(ticker)}&date=${dateStr}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  return d.price;
}

async function fetchRates() {
  const [r1, r2] = await Promise.all([
    fetch("https://api.frankfurter.app/latest?from=USD&to=TWD").then(r => r.json()),
    fetch("https://api.frankfurter.app/latest?from=JPY&to=TWD").then(r => r.json()),
  ]);
  return { USD_TWD: r1.rates.TWD, JPY_TWD: r2.rates.TWD };
}

// ══════════════════════════════════════════════════════════════════
// KI / KO Status Logic
// ══════════════════════════════════════════════════════════════════

function calcStatus(contract, priceCache) {
  const today = new Date().toISOString().slice(0, 10);
  const inObs = contract.firstObserveDate <= today && today <= contract.observeEndDate;
  const isEnd = today === contract.observeEndDate;

  const details = contract.underlyings.map(u => {
    const cur = priceCache?.prices?.[u.ticker]?.price ?? null;
    const distKi = cur != null ? ((cur - u.kiPrice) / u.kiPrice) * 100 : null;
    const distKo = cur != null ? ((cur - u.koPrice) / u.koPrice) * 100 : null;
    let ki = false;
    if (cur != null && inObs) {
      if (contract.kiMechanism === "AKI" && cur <= u.kiPrice) ki = true;
      if (contract.kiMechanism === "EKI" && isEnd && cur <= u.kiPrice) ki = true;
    }
    const nearKi = !ki && cur != null && distKi != null && distKi >= 0 && distKi < 10;
    return { ...u, cur, distKi, distKo, ki, nearKi };
  });

  const kiTriggered = details.some(d => d.ki);
  // KO: ALL underlyings must be >= koPrice
  const koTriggered = inObs && details.length > 0 &&
    details.every(d => d.cur != null && d.cur >= d.koPrice);
  const warnNearKi = !kiTriggered && details.some(d => d.nearKi);

  let status;
  if (kiTriggered) status = "KI";
  else if (koTriggered) status = "KO";
  else if (warnNearKi) status = "NEAR_KI";
  else status = "OK";

  return { status, details };
}

const STATUS_CFG = {
  KI:      { emoji: "🔴", label: "已敲入",   rowBg: "bg-red-50 dark:bg-red-950/40"    },
  KO:      { emoji: "🔵", label: "已敲出",   rowBg: "bg-blue-50 dark:bg-blue-950/40"  },
  NEAR_KI: { emoji: "🟡", label: "接近敲入", rowBg: "bg-yellow-50 dark:bg-yellow-950/40" },
  OK:      { emoji: "🟢", label: "正常",     rowBg: ""                                 },
};

// ══════════════════════════════════════════════════════════════════
// Formatters
// ══════════════════════════════════════════════════════════════════

function fmtPrice(price, market) {
  if (price == null) return "—";
  return market === "JP"
    ? `¥${Math.round(price).toLocaleString("ja-JP")}`
    : `$${Number(price).toFixed(2)}`;
}

function fmtCoupon(amount, currency, rates, useTWD) {
  if (useTWD) {
    if (!rates) return "NT$ —";
    const rate = currency === "USD" ? rates.USD_TWD : rates.JPY_TWD;
    return `NT$${Math.round(amount * rate).toLocaleString("zh-TW")}`;
  }
  const sym = currency === "USD" ? "$" : "¥";
  return `${sym}${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function mkId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ══════════════════════════════════════════════════════════════════
// ContractDetail  (expanded row table)
// ══════════════════════════════════════════════════════════════════

function ContractDetail({ details }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 mt-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            {["代碼","參考價","KO價","KI價","執行價","現價","距KI%","距KO%","狀態"].map((h, i) => (
              <th key={h} className={`py-2 px-3 font-semibold whitespace-nowrap ${i === 0 ? "text-left" : i === 8 ? "text-center" : "text-right"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {details.map(u => {
            const kiCls = u.distKi == null ? "text-gray-400"
              : u.distKi < 0 ? "text-red-600 font-bold"
              : u.distKi < 10 ? "text-yellow-600 font-bold"
              : "text-green-600";
            const koCls = u.distKo == null ? "text-gray-400"
              : u.distKo >= 0 ? "text-blue-600 font-bold"
              : "text-gray-500 dark:text-gray-400";
            return (
              <tr key={u.ticker} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="py-2 px-3 font-mono font-semibold dark:text-white">{u.ticker}</td>
                <td className="text-right py-2 px-3 text-gray-500 dark:text-gray-400">{fmtPrice(u.referencePrice, u.market)}</td>
                <td className="text-right py-2 px-3 text-blue-600">{fmtPrice(u.koPrice, u.market)}</td>
                <td className="text-right py-2 px-3 text-red-500">{fmtPrice(u.kiPrice, u.market)}</td>
                <td className="text-right py-2 px-3 text-purple-500">{fmtPrice(u.strikePrice, u.market)}</td>
                <td className="text-right py-2 px-3 font-medium dark:text-white">
                  {u.cur != null ? fmtPrice(u.cur, u.market) : <span className="text-gray-300">—</span>}
                </td>
                <td className={`text-right py-2 px-3 ${kiCls}`}>
                  {u.distKi != null ? `${u.distKi >= 0 ? "+" : ""}${u.distKi.toFixed(1)}%` : "—"}
                </td>
                <td className={`text-right py-2 px-3 ${koCls}`}>
                  {u.distKo != null ? `${u.distKo >= 0 ? "+" : ""}${u.distKo.toFixed(1)}%` : "—"}
                </td>
                <td className="text-center py-2 px-3">
                  {u.ki ? "🔴" : u.nearKi ? "🟡" : u.cur != null ? "🟢" : "⚪"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ContractModal  (add / edit)
// ══════════════════════════════════════════════════════════════════

const BLANK_FORM = {
  kiMechanism: "AKI", broker: "", productName: "", productCode: "",
  tradeDate: "", issueDate: "", firstObserveDate: "", observeEndDate: "", maturityDate: "",
  principalAmount: "", principalCurrency: "USD",
  koRatio: "100", kiRatio: "60", strikeRatio: "75",
  couponRate: "21.99", couponFrequency: "monthly",
  underlyings: [{ ticker: "" }],
};

const IC = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors";

function Field({ label, children, half }) {
  return (
    <div className={half ? "" : ""}>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ContractModal({ contract, onSave, onDelete, onClose }) {
  const isEdit = !!contract;
  const [f, setF] = useState(() => {
    if (!contract) return BLANK_FORM;
    return {
      ...contract,
      principalAmount:  String(contract.principalAmount),
      koRatio:          String(contract.koRatio * 100),
      kiRatio:          String(contract.kiRatio * 100),
      strikeRatio:      String(contract.strikeRatio * 100),
      couponRate:       String(parseFloat((contract.couponRate * 100).toFixed(6))),
      underlyings:      contract.underlyings.map(u => ({ ...u })),
    };
  });
  const [busy, setBusy]           = useState(false);
  const [err, setErr]             = useState("");
  const [delConfirm, setDelConfirm] = useState(false);

  const set  = (k, v) => setF(p => ({ ...p, [k]: v }));
  const setU = (i, k, v) => setF(p => {
    const us = [...p.underlyings];
    us[i] = { ...us[i], [k]: v };
    return { ...p, underlyings: us };
  });
  const addU = () => setF(p => ({ ...p, underlyings: [...p.underlyings, { ticker: "" }] }));
  const rmU  = i  => setF(p => ({ ...p, underlyings: p.underlyings.filter((_, j) => j !== i) }));

  const handleSave = async () => {
    if (!f.productName.trim() || !f.issueDate || f.underlyings.some(u => !u.ticker.trim())) {
      setErr("請填寫商品名稱、發行日及所有標的代碼");
      return;
    }
    setBusy(true); setErr("");
    try {
      const koR = parseFloat(f.koRatio) / 100;
      const stR = parseFloat(f.strikeRatio) / 100;
      const kiR = (parseFloat(f.kiRatio) || 0) === 0 ? stR : parseFloat(f.kiRatio) / 100;

      const underlyings = await Promise.all(f.underlyings.map(async (u) => {
        const ticker = u.ticker.trim().toUpperCase();
        const market = ticker.endsWith(".T") ? "JP" : "US";
        let ref = typeof u.referencePrice === "number" && u.referencePrice > 0 ? u.referencePrice : 0;
        if (!ref) {
          try { ref = await fetchHistorical(ticker, f.tradeDate); }
          catch { ref = 0; }
        }
        return {
          ticker, market,
          referencePrice: ref,
          koPrice:     parseFloat((ref * koR).toFixed(4)),
          kiPrice:     parseFloat((ref * kiR).toFixed(4)),
          strikePrice: parseFloat((ref * stR).toFixed(4)),
        };
      }));

      onSave({
        id:               contract?.id ?? mkId(),
        kiMechanism:      f.kiMechanism,
        broker:           f.broker,
        productName:      f.productName,
        productCode:      f.productCode,
        tradeDate:        f.tradeDate,
        issueDate:        f.issueDate,
        firstObserveDate: f.firstObserveDate,
        observeEndDate:   f.observeEndDate,
        maturityDate:     f.maturityDate,
        principalAmount:  parseFloat(f.principalAmount) || 0,
        principalCurrency: f.principalCurrency,
        koRatio: koR, kiRatio: kiR, strikeRatio: stR,
        couponRate:       (parseFloat(f.couponRate) || 0) / 100,
        couponFrequency:  f.couponFrequency,
        underlyings,
      });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h2 className="text-base font-bold dark:text-white">{isEdit ? "編輯合約" : "新增合約"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none transition-colors">✕</button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <Field label="KI 機制">
              <select className={IC} value={f.kiMechanism} onChange={e => set("kiMechanism", e.target.value)}>
                <option value="AKI">AKI（任一觀察日敲入）</option>
                <option value="EKI">EKI（僅到期日敲入）</option>
              </select>
            </Field>
            <Field label="通路">
              <input className={IC} value={f.broker} onChange={e => set("broker", e.target.value)} placeholder="如：元大證券" />
            </Field>
          </div>

          <Field label="商品名稱">
            <input className={IC} value={f.productName} onChange={e => set("productName", e.target.value)} placeholder="商品完整名稱" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="商品代號">
              <input className={IC} value={f.productCode} onChange={e => set("productCode", e.target.value)} />
            </Field>
            <Field label="本金金額">
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  className={`${IC} flex-1`}
                  value={f.principalAmount ? Number(f.principalAmount).toLocaleString() : ""}
                  onChange={e => {
                    const raw = e.target.value.replace(/,/g, "");
                    if (/^\d*$/.test(raw)) set("principalAmount", raw);
                  }}
                />
                <select className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={f.principalCurrency} onChange={e => set("principalCurrency", e.target.value)}>
                  <option>USD</option><option>JPY</option>
                </select>
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[["交易日","tradeDate"],["發行日","issueDate"],["第1保息月觀察日","firstObserveDate"],["觀察結束日","observeEndDate"],["到期日","maturityDate"]].map(([lbl, k]) => (
              <Field key={k} label={lbl}>
                <input type="date" className={IC} value={f[k]} onChange={e => set(k, e.target.value)} />
              </Field>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="KO 比例 (%)"><input type="number" step="0.1" min="0" className={IC} value={f.koRatio} onChange={e => set("koRatio", e.target.value)} /></Field>
            <Field label="KI 比例 (%)"><input type="number" step="0.1" min="0" className={IC} value={f.kiRatio} onChange={e => set("kiRatio", e.target.value)} /></Field>
            <Field label="執行價格比例 (%)"><input type="number" step="0.1" min="0" className={IC} value={f.strikeRatio} onChange={e => set("strikeRatio", e.target.value)} /></Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="年利率 (%)">
              <input type="number" step="0.01" min="0" className={IC} value={f.couponRate} onChange={e => set("couponRate", e.target.value)} />
            </Field>
            <Field label="配息頻率">
              <select className={IC} value={f.couponFrequency} onChange={e => set("couponFrequency", e.target.value)}>
                <option value="monthly">月配</option>
                <option value="quarterly">季配</option>
              </select>
            </Field>
          </div>

          {/* Underlyings */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">連結標的</label>
            <div className="space-y-2">
              {f.underlyings.map((u, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={`${IC} flex-1`}
                    placeholder="代碼（如 TSLA、7203.T）"
                    value={u.ticker}
                    onChange={e => setU(i, "ticker", e.target.value.toUpperCase())}
                  />
                  {u.referencePrice > 0 ? (
                    <span className="text-xs text-gray-400 whitespace-nowrap shrink-0 min-w-[90px]">
                      ref: {u.market === "JP" ? "¥" : "$"}{Number(u.referencePrice).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300 dark:text-gray-600 whitespace-nowrap shrink-0 min-w-[90px]">發行日自動抓取</span>
                  )}
                  {f.underlyings.length > 1 && (
                    <button onClick={() => rmU(i)} className="text-red-400 hover:text-red-600 shrink-0 transition-colors">✕</button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addU} className="mt-2.5 text-xs text-blue-500 hover:text-blue-700 transition-colors font-medium">+ 新增標的</button>
          </div>

          {err && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t dark:border-gray-700">
          <div>
            {isEdit && !delConfirm && (
              <button onClick={() => setDelConfirm(true)} className="text-sm text-red-500 hover:text-red-700 transition-colors">刪除合約</button>
            )}
            {delConfirm && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600 font-medium">確認刪除？</span>
                <button onClick={() => onDelete(contract.id)} className="text-sm bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors">確認</button>
                <button onClick={() => setDelConfirm(false)} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-white transition-colors">
              取消
            </button>
            <button onClick={handleSave} disabled={busy} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium">
              {busy ? "儲存中…" : "儲存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Main App
// ══════════════════════════════════════════════════════════════════

export default function App() {
  const [contracts, setContracts] = useState([]);
  const [priceCache, setPriceCache] = useState(null);
  const [useTWD, setUseTWD]       = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [modal, setModal]         = useState(undefined); // undefined=closed, null=new, contract=edit
  const [loading, setLoading]     = useState(false);
  const [fetchErr, setFetchErr]   = useState("");
  const [sortBy, setSortBy]       = useState(null);   // 'issueDate' | 'observeEndDate' | null
  const [sortDir, setSortDir]     = useState("asc");

  // Ref so doRefresh can always see current contracts without stale closure
  const contractsRef = useRef([]);

  const doRefresh = useCallback(async (src) => {
    const list = src ?? contractsRef.current;
    const tickers = [...new Set(list.flatMap(c => c.underlyings.map(u => u.ticker)))];
    if (!tickers.length) return;
    setLoading(true); setFetchErr("");
    try {
      // Start rates fetch immediately; batch price fetches 5-at-a-time to avoid rate limiting
      const ratesPromise = fetchRates().catch(() => null);
      const priceRes = [];
      for (let i = 0; i < tickers.length; i += 5) {
        const batch = tickers.slice(i, i + 5);
        const results = await Promise.allSettled(batch.map(t => fetchPrice(t)));
        priceRes.push(...results);
        if (i + 5 < tickers.length) await new Promise(r => setTimeout(r, 400));
      }
      const rates = await ratesPromise;
      const prices = {};
      tickers.forEach((t, i) => {
        prices[t] = priceRes[i].status === "fulfilled"
          ? priceRes[i].value
          : { price: null, currency: null };
      });
      const cache = { lastUpdated: new Date().toISOString(), rates, prices };
      setPriceCache(cache);
      sSet(PRICES_KEY, cache);
    } catch (e) {
      setFetchErr("報價更新失敗：" + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let stored = sGet(CONTRACTS_KEY) ?? [];
    const storedIds = new Set(stored.map(c => c.id));
    const newFromSeeds = SEEDS.filter(s => !storedIds.has(s.id));
    if (newFromSeeds.length > 0) {
      stored = [...stored, ...newFromSeeds];
      sSet(CONTRACTS_KEY, stored);
    }
    contractsRef.current = stored;
    setContracts(stored);

    const cached = sGet(PRICES_KEY);
    if (cached) {
      setPriceCache(cached);
      if (Date.now() - new Date(cached.lastUpdated).getTime() > CACHE_TTL) {
        doRefresh(stored);
      }
    } else {
      doRefresh(stored);
    }
  }, [doRefresh]);

  // Keep ref in sync
  useEffect(() => { contractsRef.current = contracts; }, [contracts]);

  const saveContract = useCallback((c) => {
    setContracts(prev => {
      const next = prev.some(x => x.id === c.id)
        ? prev.map(x => x.id === c.id ? c : x)
        : [...prev, c];
      contractsRef.current = next;
      sSet(CONTRACTS_KEY, next);
      return next;
    });
    setModal(undefined);
    // Refresh to pick up any new tickers
    setTimeout(() => doRefresh(), 80);
  }, [doRefresh]);

  const delContract = useCallback((id) => {
    setContracts(prev => {
      const next = prev.filter(c => c.id !== id);
      contractsRef.current = next;
      sSet(CONTRACTS_KEY, next);
      return next;
    });
    setModal(undefined);
  }, []);

  function toggleSort(field) {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
  }

  function handleExport() {
    const json = JSON.stringify(contracts, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fcn-contracts-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) throw new Error("格式錯誤");

        // Fill missing reference prices using tradeDate
        const filled = await Promise.all(imported.map(async (c) => {
          const underlyings = await Promise.all(c.underlyings.map(async (u) => {
            if (u.referencePrice > 0) return u;
            let ref = 0;
            try { ref = await fetchHistorical(u.ticker, c.tradeDate); } catch {}
            if (!ref) return u;
            return {
              ...u,
              referencePrice: ref,
              koPrice:     parseFloat((ref * c.koRatio).toFixed(4)),
              kiPrice:     parseFloat((ref * c.kiRatio).toFixed(4)),
              strikePrice: parseFloat((ref * c.strikeRatio).toFixed(4)),
            };
          }));
          return { ...c, underlyings };
        }));

        setContracts(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const toAdd = filled.filter(c => !existingIds.has(c.id));
          const merged = [
            ...prev.map(c => { const upd = filled.find(i => i.id === c.id); return upd ?? c; }),
            ...toAdd,
          ];
          contractsRef.current = merged;
          sSet(CONTRACTS_KEY, merged);
          return merged;
        });
        alert(`匯入完成，共 ${imported.length} 筆合約`);
      } catch {
        alert("匯入失敗：請確認檔案格式正確");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // Compute status for each contract
  const baseRows = contracts.map(c => ({ ...c, ...calcStatus(c, priceCache) }));
  const rows = sortBy
    ? [...baseRows].sort((a, b) => {
        const va = a[sortBy] ?? ""; const vb = b[sortBy] ?? "";
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      })
    : baseRows;
  const kiCnt   = rows.filter(r => r.status === "KI").length;
  const koCnt   = rows.filter(r => r.status === "KO").length;
  const warnCnt = rows.filter(r => r.status === "NEAR_KI").length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── Top bar ── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <h1 className="text-base font-bold dark:text-white">FCN 監控儀表板</h1>

          {/* Overview counts */}
          <div className="flex items-center gap-4 text-sm flex-1">
            <span className="text-gray-500 dark:text-gray-400">合約 <strong className="text-gray-900 dark:text-white">{rows.length}</strong></span>
            <span className="text-red-500">🔴 <strong>{kiCnt}</strong></span>
            <span className="text-blue-500">🔵 <strong>{koCnt}</strong></span>
            <span className="text-yellow-500">🟡 <strong>{warnCnt}</strong></span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {priceCache?.lastUpdated && (
              <span className="text-xs text-gray-400 hidden sm:block">
                更新：{new Date(priceCache.lastUpdated).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button
              onClick={() => doRefresh()}
              disabled={loading}
              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 border border-gray-200 dark:border-gray-700 transition-colors"
            >
              {loading ? "更新中…" : "↻ 刷新報價"}
            </button>

            {/* Export */}
            <button
              onClick={handleExport}
              title="匯出所有合約為 JSON 檔"
              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors"
            >
              ↓ 匯出
            </button>

            {/* Import */}
            <label
              title="從 JSON 檔匯入合約（與現有資料合併）"
              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
            >
              ↑ 匯入
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>

            <button
              onClick={() => setModal(null)}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + 新增合約
            </button>
          </div>
        </div>

        {fetchErr && (
          <div className="bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs px-4 py-2 max-w-6xl mx-auto">
            {fetchErr}
          </div>
        )}
      </div>

      {/* ── Contract table ── */}
      <div className="max-w-6xl mx-auto px-4 py-4">

        {/* Currency toggle */}
        <div className="flex justify-end mb-3">
          <select
            value={useTWD ? "TWD" : "orig"}
            onChange={e => setUseTWD(e.target.value === "TWD")}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="orig">原幣顯示</option>
            <option value="TWD">換算 TWD</option>
          </select>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  {[
                    { label: "通路" },
                    { label: "商品名稱" },
                    { label: "代號" },
                    { label: "發行日", field: "issueDate" },
                    { label: "觀察結束", field: "observeEndDate" },
                    { label: "年利率", align: "right" },
                    { label: "配息/月", align: "right" },
                    { label: "標的" },
                    { label: "燈號", align: "center" },
                  ].map(h => (
                    <th
                      key={h.label}
                      onClick={h.field ? () => toggleSort(h.field) : undefined}
                      className={`py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap
                        ${h.align === "right" ? "text-right" : h.align === "center" ? "text-center" : "text-left"}
                        ${h.field ? "cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 select-none" : ""}`}
                    >
                      {h.label}
                      {h.field && (
                        <span className="ml-1">
                          {sortBy === h.field ? (sortDir === "asc" ? "▲" : "▼") : <span className="opacity-25">⇅</span>}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-gray-400 dark:text-gray-600 text-sm">
                      尚無合約，點擊「新增合約」建立第一筆
                    </td>
                  </tr>
                )}
                {rows.map(c => {
                  const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.OK;
                  const expanded = expandedId === c.id;
                  const periodsPerYear = c.couponFrequency === "quarterly" ? 4 : 12;
                  const monthlyAmt = c.principalAmount * c.couponRate / periodsPerYear;

                  return [
                    <tr
                      key={c.id}
                      className={`cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${cfg.rowBg}`}
                      onClick={() => setExpandedId(expanded ? null : c.id)}
                    >
                      <td className="py-3 px-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{c.broker}</td>
                      <td className="py-3 px-3 max-w-[180px]">
                        <span className="dark:text-white font-medium" title={c.productName}>
                          {c.productName.slice(0, 12)}{c.productName.length > 12 ? "…" : ""}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-gray-400">…{c.productCode.slice(-4)}</td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{c.issueDate.slice(2)}</td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{c.observeEndDate.slice(2)}</td>
                      <td className="py-3 px-3 text-right text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {(c.couponRate * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-right text-xs font-semibold dark:text-white whitespace-nowrap">
                        {fmtCoupon(monthlyAmt, c.principalCurrency, priceCache?.rates, useTWD)}
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {c.underlyings.map(u => u.ticker).join(" / ")}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span title={cfg.label}>{cfg.emoji}</span>
                      </td>
                    </tr>,

                    expanded && (
                      <tr key={`${c.id}-detail`} className={cfg.rowBg}>
                        <td colSpan={9} className="px-4 pb-4">
                          <div className="flex items-center justify-between mb-1 mt-1">
                            <span className="text-xs text-gray-400">
                              {c.kiMechanism} · {c.couponFrequency === "monthly" ? "月配" : "季配"} · 本金 {c.principalCurrency} {c.principalAmount.toLocaleString()}
                            </span>
                            <button
                              onClick={e => { e.stopPropagation(); setModal(c); }}
                              className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 dark:border-blue-800 rounded px-2 py-0.5 transition-colors"
                            >
                              編輯
                            </button>
                          </div>
                          <ContractDetail details={c.details} />
                        </td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      {modal !== undefined && (
        <ContractModal
          contract={modal}
          onSave={saveContract}
          onDelete={delContract}
          onClose={() => setModal(undefined)}
        />
      )}
    </div>
  );
}
