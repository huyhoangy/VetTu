const localtunnel = require('localtunnel');

const PORT = process.env.PORT || 5000;
const SUBDOMAIN = process.env.TUNNEL_SUBDOMAIN || 'vettu-api-hoang';

async function startTunnel() {
  try {
    console.log(`\n⏳ Đang khởi tạo Tunnel kết nối tới port ${PORT}...`);
    const tunnel = await localtunnel({
      port: PORT,
      subdomain: SUBDOMAIN,
    });

    console.log(`\n==============================================`);
    console.log(`🎉 TUNNEL ĐÃ SẴN SÀNG VÀ ĐANG HOẠT ĐỘNG!`);
    console.log(`🌐 Public URL: ${tunnel.url}`);
    console.log(`📡 API Base:   ${tunnel.url}/api`);
    console.log(`==============================================\n`);
    console.log(`👉 Giữ cửa sổ terminal này mở trong suốt quá trình test app.`);

    tunnel.on('close', () => {
      console.log('⚠️ Tunnel đã bị ngắt. Đang tự động kết nối lại sau 3s...');
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('❌ Lỗi tunnel:', err.message);
      tunnel.close();
    });
  } catch (err) {
    console.error('❌ Không thể mở tunnel:', err.message);
    console.log('⏳ Đang thử kết nối lại sau 5s...');
    setTimeout(startTunnel, 5000);
  }
}

startTunnel();
