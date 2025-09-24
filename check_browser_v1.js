const CONFIG = {
  DISCORD_WEBHOOK: "https://discord.com/api/webhooks/1415287006812045372/rUVOURbbTWnptW5Tie4J0FdTSN7xIOqwEzOnUUEjvW-CdQj4fXNPXfuml5JdIVtdLb3G",
  STATUS_URL: "https://www.playlostark.com/en-gb/support/server-status",
  CHECK_INTERVAL: 30000,
  STORAGE_KEY: "lostark_monitor_data"
};

const WEBHOOK_PAYLOAD = {
  username: "Đội trưởng chó chrome!",
  avatar_url: "https://i.imgur.com/AfFp7pu.png",
  content: "Thông báo! <@&1415372170326179990>",
  embeds: [{title: "Thông báo", description: "Brelshaza is online 🎉", color: 15258703}]
};

let isProcessing = false, monitoringInterval = null;

function loadJQuery() {
  return new Promise(resolve => {
    if (typeof jQuery !== 'undefined') return resolve();
    const s = document.createElement('script');
    s.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

function readStorageData() {
  try {
    const d = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (d) return JSON.parse(d);
  } catch (e) {}
  return {initialStatus: null, initialStatusTime: null, lastWebhookSent: null, lastCheckTime: null};
}

function writeStorageData(data) {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

async function sendWebhook() {
    //alert("Gửi webhook");
    //return;

  if (isProcessing) return;
  isProcessing = true;
  
  try {
    const res = await fetch(CONFIG.DISCORD_WEBHOOK, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(WEBHOOK_PAYLOAD)
    });
    
    if (res.ok) {
      const t = new Date().toISOString();
      const d = readStorageData();
      d.initialStatus = "Brelshaza is online";
      d.initialStatusTime = d.lastWebhookSent = d.lastCheckTime = t;
      writeStorageData(d);
    }
  } catch (e) {
    console.error("Webhook error:", e);
  } finally {
    isProcessing = false;
  }
}

async function getServerStatus() {
  // Kiểm tra xem trang có cần refresh không (sử dụng CHECK_INTERVAL)
  const lastRefresh = localStorage.getItem('lastPageRefresh');
  const now = Date.now();
  if (!lastRefresh || (now - parseInt(lastRefresh)) > CONFIG.CHECK_INTERVAL) { 
    console.log("🔄 Refresh trang để lấy dữ liệu server mới...");
    localStorage.setItem('lastPageRefresh', now.toString());
    
    // Set title để báo hiệu đang refresh
    document.title = "Đang refresh...";
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    return "Page refreshing...";
  }
  
  console.log("🔍 Đọc trạng thái server từ DOM...");
  
  // Chỉ tìm elements có aria-label chứa Brelshaza
  const allElements = document.querySelectorAll('*');
  for (const element of allElements) {
    const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
    if (ariaLabel.includes('brelshaza')) {
      console.log("🏷️ Tìm thấy aria-label:", ariaLabel);
      
      // Check status từ aria-label
      if (ariaLabel.includes('online')) return "Brelshaza is online";
      if (ariaLabel.includes('offline')) return "Brelshaza is offline";  
      if (ariaLabel.includes('maintenance') || ariaLabel.includes('maint')) return "Brelshaza is maintenance";
      if (ariaLabel.includes('good') || ariaLabel.includes('operational')) return "Brelshaza is online";
      if (ariaLabel.includes('down') || ariaLabel.includes('unavailable')) return "Brelshaza is offline";
    }
  }
  
  return "Brelshaza status unknown";
}

async function checkAndSendWebhook() {
  const currentTime = new Date().toLocaleTimeString('vi-VN');
  console.log(`🔄 Đang kiểm tra server... [${currentTime}]`);
  
  // Kiểm tra nếu đang trong trạng thái refresh
  if (document.title.includes("Đang refresh")) {
    console.log("⏳ Trang đang refresh, bỏ qua lần check này");
    return;
  }
  
  const data = readStorageData();
  let {initialStatus} = data;
  const currentStatus = await getServerStatus();
  
  // Skip nếu đang refresh trang
  if (currentStatus === "Page refreshing...") {
    console.log("⏳ Trang đang refresh, bỏ qua lần check này");
    return;
  }
  
  const finalStatus = currentStatus || "Brelshaza status unknown";
  console.log(`📊 Status: ${finalStatus} | Saved: ${initialStatus || 'none'}`);
  
  const t = new Date().toISOString();
  
  // 1. Nếu chưa có trạng thái ban đầu, lưu trạng thái hiện tại
  if (!initialStatus) {
    data.initialStatus = finalStatus;
    data.initialStatusTime = t;
    data.lastCheckTime = t;
    writeStorageData(data);
    console.log(`💾 Lưu trạng thái ban đầu: ${finalStatus}`);
    return;
  }
  
  // 2. Kiểm tra điều kiện gửi webhook: từ không online → online
  if (finalStatus === "Brelshaza is online" && initialStatus !== "Brelshaza is online" && !isProcessing) {
    console.log(`🎉 Phát hiện chuyển đổi: ${initialStatus} → ${finalStatus} - Gửi webhook!`);
    await sendWebhook();
  }
  
  // 3. Luôn cập nhật trạng thái mới nhất và thời gian check vào storage
  data.initialStatus = finalStatus;
  data.initialStatusTime = t;
  data.lastCheckTime = t;
  writeStorageData(data);
  console.log(`💾 Cập nhật storage: ${finalStatus}`);
}

async function startMonitoring() {
  // Dừng interval cũ nếu có
  if (typeof window.lostArkInterval !== 'undefined') {
    clearInterval(window.lostArkInterval);
    console.log("⏹️ Đã dừng monitor cũ");
  }
  
  console.log("🚀 Lost Ark Monitor khởi động...");
  await loadJQuery();
  await checkAndSendWebhook();
  
  window.lostArkInterval = setInterval(async () => {
    if (!isProcessing) await checkAndSendWebhook();
  }, CONFIG.CHECK_INTERVAL);
  console.log("✅ Monitor đang chạy (30s interval)");
}

startMonitoring();
