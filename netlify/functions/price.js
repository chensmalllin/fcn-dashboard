exports.handler = async function (event) {
  const ticker = event.queryStringParameters?.ticker;
  if (!ticker) return { statusCode: 400, body: "missing ticker" };

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  try {
    const r = await fetch(url);
    if (!r.ok) return { statusCode: r.status, body: `Yahoo error ${r.status}` };
    const d = await r.json();
    const meta = d?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return { statusCode: 502, body: "no price" };
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: meta.regularMarketPrice, currency: meta.currency }),
    };
  } catch (e) {
    return { statusCode: 502, body: e.message };
  }
};
