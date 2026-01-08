// netlify/functions/create-invoice.js
// For main-page educational offers (Day / Swing / 14W)
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { product_id, title, amount_usd, customer } = body;

    if (!product_id || !title || !amount_usd || !customer?.email) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing fields" }) };
    }

    const USD_TO_XOF = Number(process.env.USD_TO_XOF || 600);
    const total_amount = Math.round(Number(amount_usd) * USD_TO_XOF);

    const isLive = (process.env.PAYDUNYA_MODE || "test") === "live";
    const endpoint = isLive
      ? "https://app.paydunya.com/api/v1/checkout-invoice/create"
      : "https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create";

    const siteUrl = process.env.URL || "https://example.netlify.app";

    const payload = {
      invoice: {
        total_amount,
        description: `14 Trades — ${title}`,
        customer: {
          email: customer.email,
          phone: customer.phone || "",
          name: "Client 14 Trades",
        },
        channels: ["card"],
      },
      store: {
        name: "14 Trades | Sadikh Sarr",
        website_url: siteUrl,
      },
      custom_data: {
        product_id,
        amount_usd: String(amount_usd),
      },
      actions: {
        cancel_url: `${siteUrl}/payment-cancel.html`,
        return_url: `${siteUrl}/payment-success.html`,
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

    return { statusCode: 200, body: JSON.stringify({ invoice_url: data.response_text, token: data.token }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
