import fetch from "node-fetch";

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1415280563518050314/oAtN8xs9rqrLp4csUy0_qB4RaaG59VPJb9MH77ckPQVCuwoaoOkNfl6kortJ_64Bn_lQ";

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
