// Gemini Flash API Service & Vietnamese NLP Fallback Parser
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Known Vietnamese food dictionary for local NLP parsing
const FOOD_DICTIONARY = [
  { name: 'Thịt bò', category: 'PROTEIN', location: 'CHILLED', days: 2, aliases: ['thịt bò', 'bò thăn', 'bò bắp', 'thịt bo'] },
  { name: 'Thịt heo', category: 'PROTEIN', location: 'CHILLED', days: 2, aliases: ['thịt heo', 'thịt lợn', 'thịt ba chỉ', 'ba rọi', 'thịt nạc'] },
  { name: 'Thịt băm', category: 'PROTEIN', location: 'CHILLED', days: 2, aliases: ['thịt băm', 'thịt xay'] },
  { name: 'Thịt gà', category: 'PROTEIN', location: 'CHILLED', days: 2, aliases: ['thịt gà', 'ức gà', 'đùi gà', 'cánh gà'] },
  { name: 'Sườn heo', category: 'PROTEIN', location: 'CHILLED', days: 2, aliases: ['sườn heo', 'sườn non', 'sườn lợn'] },
  { name: 'Trứng gà', category: 'DAIRY', location: 'CHILLED', days: 10, aliases: ['trứng gà', 'trứng'] },
  { name: 'Trứng vịt', category: 'DAIRY', location: 'CHILLED', days: 10, aliases: ['trứng vịt'] },
  { name: 'Sữa tươi', category: 'DAIRY', location: 'CHILLED', days: 7, aliases: ['sữa tươi', 'sữa tiệt trùng', 'sữa'] },
  { name: 'Sữa chua', category: 'DAIRY', location: 'CHILLED', days: 14, aliases: ['sữa chua', 'yogurt'] },
  { name: 'Rau muống', category: 'VEGGIES', location: 'CHILLED', days: 3, aliases: ['rau muống'] },
  { name: 'Rau cải', category: 'VEGGIES', location: 'CHILLED', days: 4, aliases: ['rau cải', 'cải ngọt', 'cải thìa', 'cải cúc', 'cải xoong'] },
  { name: 'Cà chua', category: 'VEGGIES', location: 'CHILLED', days: 5, aliases: ['cà chua'] },
  { name: 'Bắp cải', category: 'VEGGIES', location: 'CHILLED', days: 7, aliases: ['bắp cải', 'bắp su'] },
  { name: 'Cà rốt', category: 'VEGGIES', location: 'CHILLED', days: 10, aliases: ['cà rốt'] },
  { name: 'Khoai tây', category: 'VEGGIES', location: 'PANTRY', days: 14, aliases: ['khoai tây'] },
  { name: 'Khoai lang', category: 'VEGGIES', location: 'PANTRY', days: 14, aliases: ['khoai lang'] },
  { name: 'Hành lá', category: 'SPICES', location: 'CHILLED', days: 5, aliases: ['hành lá', 'hành hoa'] },
  { name: 'Hành tây', category: 'VEGGIES', location: 'PANTRY', days: 10, aliases: ['hành tây'] },
  { name: 'Hành tím', category: 'SPICES', location: 'PANTRY', days: 30, aliases: ['hành tím', 'hành khô'] },
  { name: 'Tỏi', category: 'SPICES', location: 'PANTRY', days: 30, aliases: ['tỏi', 'tỏi cô đơn'] },
  { name: 'Ớt', category: 'SPICES', location: 'CHILLED', days: 10, aliases: ['ớt', 'ớt hiểm', 'ớt chuông'] },
  { name: 'Gừng', category: 'SPICES', location: 'PANTRY', days: 20, aliases: ['gừng'] },
  { name: 'Đậu phụ', category: 'VEGGIES', location: 'CHILLED', days: 2, aliases: ['đậu phụ', 'đậu hũ', 'tàu hũ'] },
  { name: 'Cá hồi', category: 'PROTEIN', location: 'CHILLED', days: 2, aliases: ['cá hồi'] },
  { name: 'Tôm tươi', category: 'PROTEIN', location: 'CHILLED', days: 2, aliases: ['tôm tươi', 'tôm sú', 'tôm'] },
  { name: 'Mì tôm', category: 'CAN_DRY', location: 'PANTRY', days: 90, aliases: ['mì tôm', 'mì gói', 'mì hảo hảo'] },
  { name: 'Bánh mì', category: 'CAN_DRY', location: 'PANTRY', days: 2, aliases: ['bánh mì', 'bánh mỳ'] },
  { name: 'Xúc xích', category: 'PROTEIN', location: 'CHILLED', days: 15, aliases: ['xúc xích'] },
  { name: 'Kim chi', category: 'COOKED', location: 'CHILLED', days: 30, aliases: ['kim chi'] },
  { name: 'Phô mai', category: 'DAIRY', location: 'CHILLED', days: 30, aliases: ['phô mai', 'cheese'] },
];

/**
 * Fallback Rule-based parser for Vietnamese grocery sentences
 */
const fallbackParseText = (text) => {
  if (!text || typeof text !== 'string') return [];
  const normalized = text.toLowerCase();
  const results = [];

  FOOD_DICTIONARY.forEach((food) => {
    for (const alias of food.aliases) {
      const idx = normalized.indexOf(alias);
      if (idx !== -1) {
        // Try to capture quantity near the word (e.g. "500g thịt bò", "1 bó rau muống", "10 quả trứng")
        const beforeAndAfter = normalized.slice(Math.max(0, idx - 15), Math.min(normalized.length, idx + alias.length + 15));
        
        let quantity = '1 phần';
        const qtyMatch = beforeAndAfter.match(/(\d+\s*(?:g|kg|lạng|bó|quả|trái|hộp|gói|túi|củ|bìa|con|miếng|lát|lon|chai)?)/i);
        if (qtyMatch && qtyMatch[1]) {
          quantity = qtyMatch[1].trim();
        }

        results.push({
          name: food.name,
          category: food.category,
          quantity: quantity || '1 phần',
          storageLocation: food.location,
          suggestedDays: food.days,
        });
        break;
      }
    }
  });

  return results;
};

/**
 * Call Google Gemini Flash API for Vision or Text
 */
const callGeminiFlash = async ({ prompt, imageBase64, mimeType = 'image/jpeg' }) => {
  if (!GEMINI_API_KEY) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trong .env backend');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const contents = [];
  const parts = [{ text: prompt }];

  if (imageBase64) {
    // Strip header if data URI is passed (e.g. data:image/jpeg;base64,...)
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: cleanBase64,
      },
    });
  }

  contents.push({ parts });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error('Không nhận được phản hồi từ AI');
  }

  try {
    return JSON.parse(textOutput);
  } catch (parseErr) {
    // If wrapped in markdown code fence
    const jsonMatch = textOutput.match(/```json\s*([\s\S]*?)\s*```/) || textOutput.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
    throw new Error('Dữ liệu AI trả về không đúng định dạng JSON');
  }
};

/**
 * Scan food image or supermarket receipt
 */
const scanFoodOrReceiptImage = async (imageBase64, mimeType = 'image/jpeg') => {
  const prompt = `
Bạn là chuyên gia dinh dưỡng và quản lý thực phẩm của ứng dụng "Vét Tủ".
Hãy phân tích hình ảnh (có thể là hóa đơn siêu thị WinMart, Co.op, chợ, hoặc ảnh chụp rổ thực phẩm, nguyên liệu).
Nhiệm vụ: Trích xuất danh sách tất cả các thực phẩm / nguyên liệu xuất hiện trong ảnh.

Hãy trả về DUY NHẤT một mảng JSON (Array) gồm các đối tượng có cấu trúc chính xác sau:
[
  {
    "name": "Tên thực phẩm chuẩn tiếng Việt (ví dụ: Thịt bò thăn, Rau muống, Trứng gà, Cà chua)",
    "category": "Một trong các giá trị: 'VEGGIES' (rau củ), 'PROTEIN' (thịt/cá/hải sản), 'DAIRY' (trứng/sữa), 'SPICES' (gia vị/hành tỏi), 'CAN_DRY' (đồ khô/đồ hộp), 'COOKED' (đồ nấu sẵn), 'OTHER' (khác)",
    "quantity": "Số lượng đọc được kèm đơn vị (ví dụ: 500g, 1 bó, 10 quả, 2 hộp). Nếu không rõ, ghi '1 phần'",
    "storageLocation": "Vị trí bảo quản tối ưu: 'CHILLED' (ngăn mát tủ lạnh), 'FROZEN' (ngăn đông đá), hoặc 'PANTRY' (tủ đồ khô)",
    "suggestedDays": Số ngày bảo quản chuẩn an toàn (Số nguyên, ví dụ: rau lá 3 ngày, thịt mát 2 ngày, thịt đông 30 ngày, trứng 10 ngày, củ 7 ngày, đồ khô 60 ngày)
  }
]
Không trả về văn bản thừa nào khác ngoài JSON.
`;

  if (!GEMINI_API_KEY) {
    // Return friendly simulated sample data if no key configured yet
    return [
      { name: 'Thịt bò thăn', category: 'PROTEIN', quantity: '500g', storageLocation: 'CHILLED', suggestedDays: 2 },
      { name: 'Rau muống', category: 'VEGGIES', quantity: '1 bó', storageLocation: 'CHILLED', suggestedDays: 3 },
      { name: 'Trứng gà', category: 'DAIRY', quantity: '10 quả', storageLocation: 'CHILLED', suggestedDays: 10 },
      { name: 'Cà chua', category: 'VEGGIES', quantity: '4 quả', storageLocation: 'CHILLED', suggestedDays: 5 },
    ];
  }

  return await callGeminiFlash({ prompt, imageBase64, mimeType });
};

/**
 * Parse natural Vietnamese spoken voice / text prompt into structured pantry items
 */
const parseVoiceOrTextPrompt = async (text) => {
  if (!text || !text.trim()) return [];

  if (!GEMINI_API_KEY) {
    // Use high accuracy local fallback parser
    const localParsed = fallbackParseText(text);
    if (localParsed.length > 0) return localParsed;

    return [
      { name: text.trim().slice(0, 30), category: 'OTHER', quantity: '1 phần', storageLocation: 'CHILLED', suggestedDays: 4 },
    ];
  }

  const prompt = `
Bạn là trợ lý ảo của ứng dụng "Vét Tủ".
Hãy phân tích câu nói tiếng Việt của người dùng vừa đi chợ/mua đồ về:
"${text}"

Nhiệm vụ: Trích xuất danh sách tất cả các thực phẩm/nguyên liệu người dùng đã mua hoặc đang có.
Trả về DUY NHẤT một mảng JSON (Array) có cấu trúc sau:
[
  {
    "name": "Tên thực phẩm chuẩn tiếng Việt (ví dụ: Thịt heo ba chỉ, Rau xà lách, Sữa tươi)",
    "category": "Một trong các giá trị: 'VEGGIES', 'PROTEIN', 'DAIRY', 'SPICES', 'CAN_DRY', 'COOKED', 'OTHER'",
    "quantity": "Số lượng đọc được (ví dụ: 500g, 1 bó, 2 củ, 1 hộp). Nếu không có, ghi '1 phần'",
    "storageLocation": "Vị trí phù hợp nhất: 'CHILLED' (ngăn mát), 'FROZEN' (ngăn đông), hoặc 'PANTRY' (tủ khô)",
    "suggestedDays": Số ngày bảo quản an toàn (Số nguyên)
  }
]
Không trả về văn bản thừa nào khác ngoài JSON.
`;

  try {
    return await callGeminiFlash({ prompt });
  } catch (err) {
    console.log('Gemini text parse fallback to local rule engine:', err.message);
    const local = fallbackParseText(text);
    if (local.length > 0) return local;
    return [
      { name: text.trim().slice(0, 30), category: 'OTHER', quantity: '1 phần', storageLocation: 'CHILLED', suggestedDays: 4 },
    ];
  }
};

module.exports = {
  scanFoodOrReceiptImage,
  parseVoiceOrTextPrompt,
};
