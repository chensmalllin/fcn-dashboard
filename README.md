# FCN 監控儀表板

監控 FCN（固定配息連結股票結構型商品）的 KI / KO 狀態、配息收益，並即時追蹤連結標的現價。

## 功能

- **燈號總覽**：即時顯示各合約的敲入（🔴）、敲出（🔵）、接近敲入（🟡）、正常（🟢）狀態
- **合約管理**：新增、編輯、刪除合約；支援月配 / 季配、USD / JPY 本金
- **即時報價**：透過 Yahoo Finance 抓取美股（TSLA、NVDA…）及日股（7203.T…）現價
- **匯率換算**：配息金額可切換原幣或 TWD 顯示（使用 frankfurter.app 即時匯率）
- **歷史收盤價**：新增合約時，自動抓取發行日收盤價作為 KI / KO / 執行價計算基準
- **自動快取**：報價快取 4 小時，開啟頁面時若已過期自動更新

## 快速開始

```bash
git clone https://github.com/chensmalllin/fcn-dashboard.git
cd fcn-dashboard
npm install
npm run dev      # http://localhost:5173
```

首次開啟時會自動載入兩筆示範合約（元大 AKI、凱基 EKI），並嘗試抓取即時報價。

## KI / KO 判斷邏輯

| 機制 | 條件 |
|------|------|
| **KI（AKI）** | 在觀察期內，任一標的現價 ≤ KI 價 |
| **KI（EKI）** | 僅在觀察結束日當天，任一標的現價 ≤ KI 價 |
| **KO** | 在觀察期內，**所有**標的現價 ≥ KO 價 |
| **接近敲入** | 任一標的距 KI 價不足 10%（未敲入） |

優先順序：KI > KO > 接近敲入 > 正常

## 技術架構

| 項目 | 選擇 |
|------|------|
| UI | React 18 + Tailwind CSS v3 |
| 打包 | Vite 5 |
| 狀態儲存 | `window.storage`（Claude Artifact）/ `localStorage`（本地，自動 fallback） |
| 股價來源 | Yahoo Finance API，經 [corsproxy.io](https://corsproxy.io) 轉發 |
| 匯率來源 | [frankfurter.app](https://api.frankfurter.app)（免費，無需 API Key） |

## 指令

```bash
npm run dev      # 開發伺服器
npm run build    # 打包至 dist/
npm run preview  # 預覽 production build
```

## 合約欄位說明

| 欄位 | 說明 |
|------|------|
| KI 機制 | AKI（任一觀察日）或 EKI（僅到期日） |
| 發行日 | 用於自動抓取歷史收盤參考價 |
| 第1保息月觀察日 | 觀察期開始 |
| 觀察結束日 | 觀察期結束（EKI 的 KI 判斷基準日） |
| KO / KI / 執行價格比例 | 相對於參考價的比例，如 1.0 / 0.6 / 0.75 |
| 配息利率 | 每期配息率（如 `0.002199` = 每月 0.2199%） |
| 連結標的 | 美股直接填代碼（`TSLA`），日股加 `.T`（`7203.T`） |
