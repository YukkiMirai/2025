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
  try {
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(CONFIG.STATUS_URL)}`);
    if (!res.ok) return null;
    
    const data = await res.json();
    const html = data.contents;
    
    if (html.includes('Brelshaza is online')) return "Brelshaza is online";
    if (html.includes('Brelshaza is offline')) return "Brelshaza is offline";
    if (html.includes('Brelshaza is maintenance')) return "Brelshaza is maintenance";
    if (html.includes('Brelshaza')) return "Brelshaza status unknown";
    
    return null;
  } catch (e) {
    return null;
  }
}

async function checkAndSendWebhook() {
  console.log("🔄 Đang kiểm tra server...");
  const data = readStorageData();
  let {initialStatus} = data;
  const currentStatus = await getServerStatus();
  
  if (!currentStatus) return;
  console.log(`📊 Status: ${currentStatus} | Saved: ${initialStatus || 'none'}`);
  
  if (!initialStatus) {
    initialStatus = currentStatus;
    const t = new Date().toISOString();
    data.initialStatus = initialStatus;
    data.initialStatusTime = data.lastCheckTime = t;
    writeStorageData(data);
    if (initialStatus === "Brelshaza is online") return;
  }
  
  if (currentStatus === "Brelshaza is online" && initialStatus !== "Brelshaza is online" && !isProcessing) {
    await sendWebhook();
  }
  
  if (currentStatus !== "Brelshaza is online" && initialStatus === "Brelshaza is online") {
    const t = new Date().toISOString();
    data.initialStatus = currentStatus;
    data.initialStatusTime = data.lastCheckTime = t;
    writeStorageData(data);
  } else {
    data.lastCheckTime = new Date().toISOString();
    writeStorageData(data);
  }
}

async function startMonitoring() {
  console.log("🚀 Lost Ark Monitor khởi động...");
  await loadJQuery();
  await checkAndSendWebhook();
  if (monitoringInterval) clearInterval(monitoringInterval);
  monitoringInterval = setInterval(async () => {
    if (!isProcessing) await checkAndSendWebhook();
  }, CONFIG.CHECK_INTERVAL);
  console.log("✅ Monitor đang chạy (30s interval)");
}

startMonitoring();
