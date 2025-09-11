import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK || "https://discord.com/api/webhooks/1415280563518050314/oAtN8xs9rqrLp4csUy0_qB4RaaG59VPJb9MH77ckPQVCuwoaoOkNfl6kortJ_64Bn_lQ"; // ⚠️ Đổi từ GITHUB_TOKEN thành DISCORD_WEBHOOK
const STATUS_URL = "https://www.playlostark.com/en-gb/support/server-status";
const DATA_FILE = "webhook_data.json";

// GitHub Gist config (cho GitHub Actions) - CHỈ DÙNG SECRETS!
const GITHUB_TOKEN = process.env.GIST_TOKEN; // ⚠️ Đổi từ GITHUB_TOKEN thành GIST_TOKEN
const GIST_ID = process.env.GIST_ID; // ⚠️ PHẢI từ GitHub Secrets
// ❌ KHÔNG BAO GIỜ hardcode token vào code!

// Payload Discord webhook
const payload = {
  "username": "Đội trưởng chó!",
  "avatar_url": "https://i.imgur.com/AfFp7pu.png",
  "content": "Thông báo! <@&1415372170326179990>",
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

// Khởi tạo initialStatus từ file khi script bắt đầu
async function initializeFromFile() {
  console.log("DEBUG: Đang thử khởi tạo từ file...");
  const data = await readWebhookData();
  console.log("DEBUG: Dữ liệu đọc từ file:", JSON.stringify(data, null, 2));
  
  if (data.initialStatus) {
    initialStatus = data.initialStatus;
    const statusTime = data.initialStatusTime ? new Date(data.initialStatusTime).toLocaleString('vi-VN') : 'không rõ';
    console.log("Khởi tạo trạng thái ban đầu từ file:", initialStatus, "- Thời gian:", statusTime);
  } else {
    console.log("DEBUG: Không có initialStatus trong file");
  }
}

// Hàm đọc dữ liệu từ file hoặc Gist
async function readWebhookData() {
  let result = { initialStatus: null, initialStatusTime: null };
  
  // Nếu đang chạy trong GitHub Actions, dùng Gist
  if (process.env.GITHUB_ACTIONS && GITHUB_TOKEN && GIST_ID) {
    try {
      console.log("DEBUG: Đọc dữ liệu từ GitHub Gist...");
      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.ok) {
        const gist = await response.json();
        const fileContent = gist.files['webhook_data.json']?.content;
        if (fileContent) {
          const gistData = JSON.parse(fileContent);
          // Merge với default values để đảm bảo có đủ fields
          result = { ...result, ...gistData };
          return result;
        }
      }
    } catch (error) {
      console.log("Lỗi khi đọc từ Gist:", error.message);
    }
  }
  
  // Fallback: đọc từ file local
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      const fileData = JSON.parse(data);
      // Merge với default values để đảm bảo có đủ fields
      result = { ...result, ...fileData };
      return result;
    }
  } catch (error) {
    console.log("Lỗi khi đọc file dữ liệu:", error.message);
  }
  
  return result;
}

// Hàm ghi dữ liệu vào file hoặc Gist
async function writeWebhookData(data) {
  // Nếu đang chạy trong GitHub Actions, ghi vào Gist
  if (process.env.GITHUB_ACTIONS && GITHUB_TOKEN && GIST_ID) {
    try {
      console.log("DEBUG: Ghi dữ liệu vào GitHub Gist...");
      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            'webhook_data.json': {
              content: JSON.stringify(data, null, 2)
            }
          }
        })
      });
      
      if (response.ok) {
        console.log("DEBUG: Đã ghi thành công vào Gist");
        return;
      } else {
        console.log("DEBUG: Lỗi ghi Gist:", response.status);
      }
    } catch (error) {
      console.log("Lỗi khi ghi vào Gist:", error.message);
    }
  }
  
  // Fallback: ghi vào file local
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log("DEBUG: Đã ghi vào file local");
  } catch (error) {
    console.log("Lỗi khi ghi file dữ liệu:", error.message);
  }
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
    } else {
      throw new Error(`HTTP Error: ${response.status}`);
    }
  } catch (error) {
    console.error("Lỗi khi gửi webhook:", error.message);
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
        } else if (text.includes('maintenance') || text.includes('Maintenance')) {
          serverStatus = "Brelshaza is maintenance";
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
      } else if (html.includes('Brelshaza is maintenance')) {
        serverStatus = "Brelshaza is maintenance";
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
  // Khởi tạo từ file nếu chưa có
  if (initialStatus === null) {
    await initializeFromFile();
  }
  
  // Đọc dữ liệu từ file
  const data = await readWebhookData();
  
  // Lấy trạng thái server hiện tại
  const currentStatus = await getServerStatus();
  
  if (!currentStatus) {
    console.log("Không thể lấy trạng thái server");
    return;
  }
  
  console.log("Trạng thái hiện tại:", currentStatus);
  console.log("Trạng thái ban đầu đã lưu:", initialStatus);
  
  // Nếu chưa có initial status thì lưu lại
  if (initialStatus === null) {
    initialStatus = currentStatus;
    const statusTime = new Date().toISOString();
    console.log("Lưu trạng thái ban đầu mới:", initialStatus, "- Thời gian:", new Date(statusTime).toLocaleString('vi-VN'));
    
    // Lưu vào file
    await writeWebhookData({
      initialStatus: initialStatus,
      initialStatusTime: statusTime
    });
    
    // Nếu ban đầu đã online thì không gửi webhook
    if (initialStatus === "Brelshaza is online") {
      console.log("Server đã online từ đầu, không gửi webhook");
      return;
    }
  }
  
  // ✅ LOGIC MỚI ĐƠN GIẢN: 
  // Chỉ gửi webhook khi server chuyển từ (offline/maintenance) sang online
  console.log("=== KIỂM TRA ĐIỀU KIỆN GỬI WEBHOOK ===");
  console.log("- Server hiện tại online?", currentStatus === "Brelshaza is online");
  console.log("- Trạng thái ban đầu khác online?", initialStatus !== "Brelshaza is online");
  console.log("- Không đang xử lý?", !isProcessing);
  
  if (currentStatus === "Brelshaza is online" && 
      initialStatus !== "Brelshaza is online" && 
      !isProcessing) {
    console.log("✅ TẤT CẢ ĐIỀU KIỆN ĐÃ THỎA MÃN - GỬI WEBHOOK!");
    console.log("Phát hiện server chuyển từ", initialStatus, "sang online!");
    await sendWebhook(false);
  } else {
    console.log("❌ KHÔNG GỬI WEBHOOK - Lý do:");
    if (currentStatus !== "Brelshaza is online") {
      console.log("  → Server chưa online");
    }
    if (initialStatus === "Brelshaza is online") {
      console.log("  → Server đã online từ đầu (không có sự chuyển đổi)");
    }
    if (isProcessing) {
      console.log("  → Đang xử lý webhook khác");
    }
  }
  
  // Reset initialStatus nếu server hiện tại không online (offline/maintenance)
  // Để chuẩn bị cho lần online tiếp theo
  if (currentStatus !== "Brelshaza is online" && initialStatus === "Brelshaza is online") {
    const statusTime = new Date().toISOString();
    console.log("Server chuyển từ online sang", currentStatus, "- reset trạng thái ban đầu - Thời gian:", new Date(statusTime).toLocaleString('vi-VN'));
    initialStatus = currentStatus;
    
    // Cập nhật vào file
    await writeWebhookData({
      initialStatus: initialStatus,
      initialStatusTime: statusTime
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
    // Chỉ kiểm tra nếu không đang xử lý
    if (!isProcessing) {
      await checkAndSendWebhook();
    }
  }, 30000); // 30 giây
}

// Hàm reset để test
function resetWebhookData() {
  writeWebhookData({
    initialStatus: null,
    initialStatusTime: null
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
