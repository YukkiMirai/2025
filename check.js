import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1415287006812045372/rUVOURbbTWnptW5Tie4J0FdTSN7xIOqwEzOnUUEjvW-CdQj4fXNPXfuml5JdIVtdLb3G";
const STATUS_URL = "https://www.playlostark.com/en-gb/support/server-status";
const DATA_FILE = "webhook_data.json";

// Payload Discord webhook
const payload = {
  "username": "Đội trưởng chó!",
  "avatar_url": "https://i.imgur.com/AfFp7pu.png",
  "content": "Thông báo! <@&1141669486697644032>",
  "embeds": [
    {
      "title": "Thông báo",
      "description": "Brelshaza is online 🎉",
      "color": 15258703
    }
  ]
};

// Biến global để tracking
let isProcessing = false;
let initialStatus = null;

// Hàm đọc dữ liệu từ file
function readWebhookData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log("Lỗi khi đọc file dữ liệu:", error.message);
  }
  return { webhookSent: false, webhookTime: null, initialStatus: null };
}

// Hàm ghi dữ liệu vào file
function writeWebhookData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log("Lỗi khi ghi file dữ liệu:", error.message);
  }
}

// Hàm kiểm tra webhook có hết hạn không (1 ngày)
function isWebhookDataExpired() {
  const data = readWebhookData();
  if (!data.webhookTime) return true;
  
  const savedTime = new Date(data.webhookTime);
  const currentTime = new Date();
  const diffHours = (currentTime - savedTime) / (1000 * 60 * 60);
  
  return diffHours >= 24; // 24 giờ = 1 ngày
}

// Hàm gửi webhook
async function sendWebhook(isManual = false) {
  if (isProcessing) return;
  
  isProcessing = true;
  console.log(isManual ? "Gửi webhook thủ công..." : "Gửi webhook tự động...");
  
  try {
    const response = await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log("Webhook đã gửi thành công! Status:", response.status);
      
      // Lưu trạng thái đã gửi vào file
      const existingData = readWebhookData();
      writeWebhookData({
        ...existingData,
        webhookSent: true,
        webhookTime: new Date().toISOString()
      });
    } else {
      throw new Error(`HTTP Error: ${response.status}`);
    }
  } catch (error) {
    console.error("Lỗi khi gửi webhook:", error.message);
    
    // Nếu lỗi thì xóa flag để có thể thử lại
    writeWebhookData({
      webhookSent: false,
      webhookTime: null
    });
  } finally {
    isProcessing = false;
  }
}

// Hàm lấy trạng thái server từ website
async function getServerStatus() {
  try {
    console.log("Đang kiểm tra trạng thái server...");
    
    const response = await fetch(STATUS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Tìm element chứa thông tin Brelshaza
    let serverStatus = null;
    
    // Thử nhiều cách tìm kiếm
    const allElements = document.querySelectorAll('*');
    
    for (const element of allElements) {
      const text = element.textContent;
      const ariaLabel = element.getAttribute('aria-label');
      
      if (text && text.includes('Brelshaza')) {
        if (text.includes('online') || text.includes('Online')) {
          serverStatus = "Brelshaza is online";
        } else if (text.includes('offline') || text.includes('Offline')) {
          serverStatus = "Brelshaza is offline";
        }
      }
      
      if (ariaLabel && ariaLabel.includes('Brelshaza')) {
        serverStatus = ariaLabel;
      }
    }

    // Nếu không tìm thấy bằng cách trên, tìm trong toàn bộ HTML
    if (!serverStatus) {
      if (html.includes('Brelshaza is online')) {
        serverStatus = "Brelshaza is online";
      } else if (html.includes('Brelshaza is offline')) {
        serverStatus = "Brelshaza is offline";
      } else if (html.includes('Brelshaza')) {
        serverStatus = "Brelshaza status unknown";
      }
    }

    return serverStatus;
  } catch (error) {
    console.error("Lỗi khi lấy trạng thái server:", error.message);
    return null;
  }
}

// Hàm kiểm tra và gửi webhook
async function checkAndSendWebhook() {
  // Kiểm tra dữ liệu có hết hạn không
  if (isWebhookDataExpired()) {
    writeWebhookData({
      webhookSent: false,
      webhookTime: null,
      initialStatus: null
    });
  }
  
  // Đọc dữ liệu từ file
  const data = readWebhookData();
  const hasSentWebhook = data.webhookSent === true;
  
  // Khôi phục initialStatus từ file nếu có
  if (initialStatus === null && data.initialStatus) {
    initialStatus = data.initialStatus;
    console.log("Khôi phục trạng thái ban đầu từ file:", initialStatus);
  }
  
  // Lấy trạng thái server hiện tại
  const currentStatus = await getServerStatus();
  
  if (!currentStatus) {
    console.log("Không thể lấy trạng thái server");
    return;
  }
  
  console.log("Trạng thái hiện tại:", currentStatus);
  
  // Nếu chưa có initial status thì lưu lại
  if (initialStatus === null) {
    initialStatus = currentStatus;
    console.log("Trạng thái ban đầu:", initialStatus);
    
    // Lưu vào file
    writeWebhookData({
      ...data,
      initialStatus: initialStatus
    });
    
    // Nếu ban đầu đã online thì không gửi webhook
    if (initialStatus === "Brelshaza is online") {
      console.log("Server đã online từ đầu, không gửi webhook");
      return;
    }
  }
  
  // Chỉ gửi webhook khi:
  // 1. Trạng thái thay đổi từ offline sang online
  // 2. Chưa gửi webhook trong ngày
  // 3. Không đang xử lý
  if (currentStatus === "Brelshaza is online" && 
      initialStatus !== "Brelshaza is online" && 
      !hasSentWebhook && 
      !isProcessing) {
    console.log("Phát hiện server chuyển từ offline sang online!");
    await sendWebhook(false);
  }
  
  // Reset initialStatus nếu server hiện tại offline (để chuẩn bị cho lần online tiếp theo)
  if (currentStatus !== "Brelshaza is online" && initialStatus === "Brelshaza is online") {
    console.log("Server chuyển từ online sang offline, reset trạng thái ban đầu");
    initialStatus = currentStatus;
    
    // Cập nhật vào file (nhưng không reset webhook đã gửi)
    writeWebhookData({
      ...data,
      initialStatus: initialStatus
    });
  }
}

// Hàm chạy kiểm tra một lần (cho GitHub Actions)
async function runOnce() {
  console.log("Kiểm tra trạng thái server Lost Ark...");
  await checkAndSendWebhook();
  console.log("Hoàn thành kiểm tra.");
}

// Hàm chạy kiểm tra định kỳ (cho chạy local)
async function startMonitoring() {
  console.log("Bắt đầu theo dõi trạng thái server Lost Ark...");
  
  // Kiểm tra ngay lập tức
  await checkAndSendWebhook();
  
  // Thiết lập kiểm tra định kỳ mỗi 30 giây
  setInterval(async () => {
    const data = readWebhookData();
    const hasSentWebhook = data.webhookSent === true;
    const isExpired = isWebhookDataExpired();
    
    // Chỉ kiểm tra nếu chưa gửi webhook hoặc webhook đã hết hạn
    if (!isProcessing && (!hasSentWebhook || isExpired)) {
      await checkAndSendWebhook();
    }
  }, 30000); // 30 giây
}

// Hàm reset để test
function resetWebhookData() {
  writeWebhookData({
    webhookSent: false,
    webhookTime: null,
    initialStatus: null
  });
  initialStatus = null;
  console.log("Đã reset dữ liệu webhook");
}

// Export functions để có thể sử dụng từ bên ngoài
export { startMonitoring, runOnce, resetWebhookData, sendWebhook };

// Chạy nếu file được execute trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
  // Kiểm tra argument để quyết định chế độ chạy
  const args = process.argv.slice(2);
  
  if (args.includes('--once') || process.env.GITHUB_ACTIONS) {
    // Chạy một lần cho GitHub Actions hoặc khi có flag --once
    runOnce();
  } else {
    // Chạy định kỳ cho local development
    startMonitoring();
  }
}
