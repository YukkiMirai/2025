const CONFIG = {
  DISCORD_WEBHOOK: "https://discord.com/api/webhooks/1415287006812045372/rUVOURbbTWnptW5Tie4J0FdTSN7xIOqwEzOnUUEjvW-CdQj4fXNPXfuml5JdIVtdLb3G",
  STATUS_URL: "https://www.playlostark.com/en-gb/support/server-status",
  CHECK_INTERVAL: 30000,
  STORAGE_KEY: "lostark_monitor_data"
};

const WEBHOOK_PAYLOAD = {
  username: "Đội trưởng chó!",
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
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    return "Page refreshing...";
  }
  
  console.log("🔍 Đọc trạng thái server từ DOM...");
  
  // Tìm tất cả text chứa Brelshaza
  const allElements = document.querySelectorAll('*');
  for (const element of allElements) {
    const text = (element.textContent || '').toLowerCase();
    if (text.includes('brelshaza')) {
      console.log("� Tìm thấy:", element.textContent.substring(0, 150));
      
      // Check các trạng thái có thể
      if (text.includes('online')) return "Brelshaza is online";
      if (text.includes('offline')) return "Brelshaza is offline";  
      if (text.includes('maintenance') || text.includes('maint')) return "Brelshaza is maintenance";
      if (text.includes('good') || text.includes('operational')) return "Brelshaza is online";
      if (text.includes('down') || text.includes('unavailable')) return "Brelshaza is offline";
    }
  }
  
  // Tìm theo các class/selector có thể có
  const selectors = [
    '[class*="server"]', '[class*="status"]', '[data-server*="brelshaza"]',
    '.server-status', '.status', '[aria-label*="brelshaza"]'
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      const text = (el.textContent || el.getAttribute('aria-label') || '').toLowerCase();
      if (text.includes('brelshaza')) {
        console.log("� Selector tìm thấy:", text.substring(0, 100));
        if (text.includes('online') || el.classList.contains('online')) return "Brelshaza is online";
        if (text.includes('offline') || el.classList.contains('offline')) return "Brelshaza is offline";
        if (text.includes('maintenance') || el.classList.contains('maintenance')) return "Brelshaza is maintenance";
      }
    }
  }
  
  return "Brelshaza status unknown";
}

async function checkAndSendWebhook() {
  const currentTime = new Date().toLocaleTimeString('vi-VN');
  console.log(`🔄 Đang kiểm tra server... [${currentTime}]`);
  const data = readStorageData();
  let {initialStatus} = data;
  const currentStatus = await getServerStatus();
  
  // Fix: Nếu không lấy được status thì set thành unknown
  const finalStatus = currentStatus || "Brelshaza status unknown";
  console.log(`📊 Status: ${finalStatus} | Saved: ${initialStatus || 'none'}`);
  
  // Luôn update lastCheckTime mỗi lần check
  const t = new Date().toISOString();
  data.lastCheckTime = t;
  
  if (!initialStatus) {
    initialStatus = finalStatus;
    data.initialStatus = initialStatus;
    data.initialStatusTime = t;
    writeStorageData(data);
    if (initialStatus === "Brelshaza is online") return;
  }
  
  if (finalStatus === "Brelshaza is online" && initialStatus !== "Brelshaza is online" && !isProcessing) {
    await sendWebhook();
  }
  
  if (finalStatus !== "Brelshaza is online" && initialStatus === "Brelshaza is online") {
    data.initialStatus = finalStatus;
    data.initialStatusTime = t;
    writeStorageData(data);
  } else {
    writeStorageData(data);
  }
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
