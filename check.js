import fetch from "node-fetch";

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/NEW_ID/NEW_TOKEN";

const payload = {
  content: "Test message ✅"
};

const res = await fetch(DISCORD_WEBHOOK, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

console.log("Status:", res.status);
console.log("Response:", await res.text());
