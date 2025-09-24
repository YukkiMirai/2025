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
    // Thử nhiều proxy khác nhau
    const proxies = [
      `https://cors-anywhere.herokuapp.com/${CONFIG.STATUS_URL}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(CONFIG.STATUS_URL)}`,
      `https://corsproxy.io/?${encodeURIComponent(CONFIG.STATUS_URL)}`
    ];
    
    for (let proxyUrl of proxies) {
      try {
        const res = await fetch(proxyUrl, {
          headers: {'X-Requested-With': 'XMLHttpRequest'}
        });
        
        if (res.ok) {
          const html = await res.text();
          
          if (html.includes('Brelshaza is online')) return "Brelshaza is online";
          if (html.includes('Brelshaza is offline')) return "Brelshaza is offline";
          if (html.includes('Brelshaza is maintenance')) return "Brelshaza is maintenance";
          if (html.includes('Brelshaza')) return "Brelshaza status detected";
          
          // Nếu có response nhưng không tìm thấy Brelshaza
          console.log("⚠️ Response received but no Brelshaza found");
          break;
        }
      } catch (e) {
        console.log(`❌ Proxy failed: ${proxyUrl.substring(0, 30)}...`);
      }
    }
    
    return null;
  } catch (e) {
    console.log("❌ All proxies failed");
    return null;
  }
}

async function checkAndSendWebhook() {
  console.log("🔄 Đang kiểm tra server...");
  const data = readStorageData();
  let {initialStatus} = data;
  const currentStatus = await getServerStatus();
  
  // Fix: Nếu không lấy được status thì set thành unknown
  const finalStatus = currentStatus || "Brelshaza status unknown";
  console.log(`📊 Status: ${finalStatus} | Saved: ${initialStatus || 'none'}`);
  
  if (!initialStatus) {
    initialStatus = finalStatus;
    const t = new Date().toISOString();
    data.initialStatus = initialStatus;
    data.initialStatusTime = data.lastCheckTime = t;
    writeStorageData(data);
    if (initialStatus === "Brelshaza is online") return;
  }
  
  if (finalStatus === "Brelshaza is online" && initialStatus !== "Brelshaza is online" && !isProcessing) {
    await sendWebhook();
  }
  
  if (finalStatus !== "Brelshaza is online" && initialStatus === "Brelshaza is online") {
    const t = new Date().toISOString();
    data.initialStatus = finalStatus;
    data.initialStatusTime = data.lastCheckTime = t;
    writeStorageData(data);
  } else {
    data.lastCheckTime = new Date().toISOString();
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
