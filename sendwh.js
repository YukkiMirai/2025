// Tạo nút test webhook đơn giản
const testButton = document.createElement('button');
testButton.innerHTML = '🚀 Test Webhook';
testButton.style.cssText = `
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  padding: 10px 15px;
  background: #7289da;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
`;

testButton.onclick = async () => {
  testButton.innerHTML = '⏳ Đang gửi...';
  testButton.disabled = true;
  
  try {
    const response = await fetch("https://discord.com/api/webhooks/1415287006812045372/rUVOURbbTWnptW5Tie4J0FdTSN7xIOqwEzOnUUEjvW-CdQj4fXNPXfuml5JdIVtdLb3G", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        username: "Đội trưởng chó!",
          content: "Thông báo!",
        avatar_url: "https://i.imgur.com/AfFp7pu.png",
        embeds: [{
          title: "Test Webhook",
          description: "Thông báo test! 🎉", 
          color: 15258703
        }]
      })
    });
    
    if (response.ok) {
      testButton.innerHTML = '✅ Đã gửi!';
      console.log('✅ Test webhook thành công!');
    } else {
      testButton.innerHTML = '❌ Lỗi!';
      console.log('❌ Lỗi gửi webhook:', response.status);
    }
  } catch (error) {
    testButton.innerHTML = '❌ Lỗi!';
    console.log('❌ Lỗi:', error);
  }
  
  setTimeout(() => {
    testButton.innerHTML = '🚀 Test Webhook';
    testButton.disabled = false;
  }, 3000);
};

document.body.appendChild(testButton);
console.log('✅ Đã thêm nút test webhook ở góc phải trên!');
