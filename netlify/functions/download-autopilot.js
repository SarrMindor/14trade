// netlify/functions/download-autopilot.js
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function verify(dl, secret){
  const [body, sig] = String(dl || "").split(".");
  if(!body || !sig) return null;

  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64")
    .replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");

  if(expected !== sig) return null;

  const json = JSON.parse(Buffer.from(body.replace(/-/g,"+").replace(/_/g,"/"), "base64").toString("utf8"));
  return json;
}

exports.handler = async (event) => {
  try {
    const dl = event.queryStringParameters?.dl;
    if(!dl) return { statusCode: 400, body: "Missing dl" };

    const secret = process.env.DOWNLOAD_SECRET;
    if(!secret) return { statusCode: 500, body: "Missing DOWNLOAD_SECRET" };

    const payload = verify(dl, secret);
    if(!payload) return { statusCode: 403, body: "Invalid token" };

    if(Date.now() > payload.exp) return { statusCode: 410, body: "Link expired" };

    // Serve the ZIP pack (EA + guides)
    const filePath = path.join(process.cwd(), "private", "ea", "GoldAutopilot200_Pack.zip");

    if(!fs.existsSync(filePath)){
      return { statusCode: 404, body: "Pack zip not found. Add private/ea/GoldAutopilot200_Pack.zip to the repo." };
    }

    const file = fs.readFileSync(filePath);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=GoldAutopilot200_Pack.zip",
        "Cache-Control": "no-store",
      },
      body: file.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
