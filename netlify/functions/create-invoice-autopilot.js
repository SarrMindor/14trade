// netlify/functions/create-invoice-autopilot.js
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { email, phone, mt5, plan } = body;

    if (!email || !mt5 || !plan) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing fields" }) };
    }

    const planMap = { basic: 50, normal: 100, elite: 200 };
    const amount_usd = planMap[String(plan).toLowerCase()];
    if (!amount_usd) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid plan" }) };
    }

    const USD_TO_XOF = Number(process.env.USD_TO_XOF || 600);
    const total_amount = Math.round(amount_usd * USD_TO_XOF);

    const isLive = (process.env.PAYDUNYA_MODE || "test") === "live";
    const endpoint = isLive
      ? "https://app.paydunya.com/api/v1/checkout-invoice/create"
      : "https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create";

    const siteUrl = process.env.URL || "https://example.netlify.app";

    const payload = {
      invoice: {
        total_amount,
        description: `Gold Autopilot 200 — Plan ${String(plan).toUpperCase()}`,
        customer: { email, phone: phone || "", name: "Client Gold Autopilot" },
        channels: ["card"],
      },
      store: { name: "14 Trades | Sadikh Sarr", website_url: siteUrl },
      custom_data: { product: "gold_autopilot_200", plan, mt5, amount_usd: String(amount_usd) },
      actions: {
        cancel_url: `${siteUrl}/autopilot-cancel.html`,
        return_url: `${siteUrl}/autopilot-success.html`,
      },
    };

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYDUNYA-MASTER-KEY": process.env.PAYDUNYA_MASTER_KEY,
        "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY,
        "PAYDUNYA-TOKEN": process.env.PAYDUNYA_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();

    if (!resp.ok || data?.response_code !== "00") {
      return { statusCode: 500, body: JSON.stringify({ error: "PayDunya error", details: data }) };
    }

    return { statusCode: 200, body: JSON.stringify({ invoice_url: data.response_text, invoice_token: data.token }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
