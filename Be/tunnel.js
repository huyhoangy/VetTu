const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;
const envPath = path.join(__dirname, '..', 'Fe', '.env');

console.log(`\n==========================================================`);
console.log(`🚀 ĐANG KHỞI ĐỘNG CLOUDFLARE TUNNEL CHO PORT ${PORT}...`);
console.log(`==========================================================\n`);

const cloudflared = spawn('npx', ['-y', 'cloudflared', 'tunnel', '--url', `http://localhost:${PORT}`], {
  shell: true,
});

let tunnelUrl = '';

cloudflared.stderr.on('data', (data) => {
  const output = data.toString();

  // Extract trycloudflare url
  const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (match && !tunnelUrl) {
    tunnelUrl = match[0];
    const apiUrl = `${tunnelUrl}/api`;

    console.log(`\n🎉 CLOUDFLARE TUNNEL ĐÃ SẴN SÀNG!`);
    console.log(`----------------------------------------------------------`);
    console.log(`🌐 Public URL:   ${tunnelUrl}`);
    console.log(`📡 API Endpoint: ${apiUrl}`);
    console.log(`----------------------------------------------------------`);

    // Auto-update Fe/.env
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('EXPO_PUBLIC_API_URL=')) {
        envContent = envContent.replace(/EXPO_PUBLIC_API_URL=.*/, `EXPO_PUBLIC_API_URL=${apiUrl}`);
      } else {
        envContent = `EXPO_PUBLIC_API_URL=${apiUrl}\n` + envContent;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log(`✅ Đã tự động cập nhật EXPO_PUBLIC_API_URL trong Fe/.env!`);
    }

    console.log(`👉 Bấm 'r' trong terminal Expo để reload app trên điện thoại.`);
    console.log(`👉 Giữ cửa sổ terminal này chạy trong lúc test app.\n`);
  }
});

cloudflared.on('close', (code) => {
  console.log(`⚠️ Tunnel đã đóng (code ${code}).`);
});
