// netlify/functions/verify-autopilot.js
const crypto = require("crypto");

function b64url(input){
  return Buffer.from(input).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
}
function sign(payload, secret){
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64")
    .replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
  return `${body}.${sig}`;
}

exports.handler = async (event) => {
  try {
    const { invoice_token } = JSON.parse(event.body || "{}");
    if(!invoice_token) return { statusCode: 400, body: JSON.stringify({ ok:false, error:"Missing invoice_token" }) };

    const isLive = (process.env.PAYDUNYA_MODE || "test") === "live";
    const endpoint = isLive
      ? `https://app.paydunya.com/api/v1/checkout-invoice/confirm/${invoice_token}`
      : `https://app.paydunya.com/sandbox-api/v1/checkout-invoice/confirm/${invoice_token}`;

    const resp = await fetch(endpoint, {
      method: "GET",
      headers: {
        "PAYDUNYA-MASTER-KEY": process.env.PAYDUNYA_MASTER_KEY,
        "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY,
        "PAYDUNYA-TOKEN": process.env.PAYDUNYA_TOKEN,
      },
    });

    const data = await resp.json();

    if (!resp.ok || data?.status !== "completed") {
      return { statusCode: 402, body: JSON.stringify({ ok:false, error:"Paiement non confirmé (status != completed).", details:data }) };
    }

    const exp = Date.now() + 10 * 60 * 1000; // 10 minutes
    const secret = process.env.DOWNLOAD_SECRET;
    if(!secret) return { statusCode: 500, body: JSON.stringify({ ok:false, error:"Missing DOWNLOAD_SECRET env var" }) };

    const download_token = sign({ invoice_token, exp }, secret);

    return { statusCode: 200, body: JSON.stringify({ ok:true, download_token }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error:e.message }) };
  }
};
