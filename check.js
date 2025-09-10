import fetch from "node-fetch";

// URL webhook Discord của bạn
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1415262191996768307/Rdfm_1vHjqemMDVvObRcDTmNyF_3RRdhGI82EJJOTuExBFjQlqLLhgB3ZDRF-SgvGIr3";

// Hàm gửi webhook
async function sendWebhook(message) {
  const payload = {
    username: "Captain Hook",
    avatar_url: "https://i.imgur.com/AfFp7pu.png",
    content: message,
    embeds: [
      {
        title: "Thông báo",
        description: message,
        color: 15258703,
      },
    ],
  };

  const res = await fetch(DISCORD_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("Lỗi gửi webhook:", res.statusText);
  } else {
    console.log("✅ Đã gửi webhook thành công!");
  }
}

// Fake check (bạn thay bằng logic thật, ví dụ fetch Lost Ark status page)
const serverStatus = "Brelshaza is online";

if (serverStatus === "Brelshaza is online") {
  sendWebhook("Brelshaza is online 🎉");
} else {
  console.log("Server chưa online.");
}
