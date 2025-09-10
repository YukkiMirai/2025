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

  try {
    console.log("Đang gửi webhook...");
    console.log("Payload:", JSON.stringify(payload, null, 2));
    
    const res = await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("Response status:", res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("Lỗi gửi webhook:", res.status, res.statusText);
      console.error("Chi tiết lỗi:", errorText);
      
      // Thử gửi message đơn giản hơn
      const simplePayload = {
        content: message
      };
      
      console.log("Thử gửi message đơn giản...");
      const simpleRes = await fetch(DISCORD_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(simplePayload),
      });
      
      if (simpleRes.ok) {
        console.log("✅ Đã gửi webhook đơn giản thành công!");
      } else {
        const simpleError = await simpleRes.text();
        console.error("Lỗi gửi webhook đơn giản:", simpleRes.status, simpleError);
      }
    } else {
      console.log("✅ Đã gửi webhook thành công!");
    }
  } catch (error) {
    console.error("Lỗi kết nối:", error.message);
  }
}

// Fake check (bạn thay bằng logic thật, ví dụ fetch Lost Ark status page)
const serverStatus = "Brelshaza is online";

if (serverStatus === "Brelshaza is online") {
  sendWebhook("Brelshaza is online 🎉");
} else {
  console.log("Server chưa online.");
}
