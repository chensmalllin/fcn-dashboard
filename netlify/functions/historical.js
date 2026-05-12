exports.handler = async function (event) {
  const { ticker, date } = event.queryStringParameters ?? {};
  if (!ticker || !date) return { statusCode: 400, body: "missing ticker or date" };

  const d = new Date(date + "T00:00:00Z");
  const p1 = Math.floor(d.getTime() / 1000);
  const p2 = p1 + 86400 * 5; // 5-day window for weekends/holidays
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&period1=${p1}&period2=${p2}`;

  try {
    const r = await fetch(url);
    if (!r.ok) return { statusCode: r.status, body: `Yahoo error ${r.status}` };
    const data = await r.json();
    const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const valid = closes.find(v => v != null);
    if (!valid) return { statusCode: 502, body: `no close for ${ticker} on ${date}` };
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: valid }),
    };
  } catch (e) {
    return { statusCode: 502, body: e.message };
  }
};
