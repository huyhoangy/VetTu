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
 * Call Google Gemini Flash API for Vision or Text with Multi-Model Fallback
 */
const callGeminiFlash = async ({ prompt, imageBase64, mimeType = 'image/jpeg', temperature = 0.85 }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trong .env backend');
  }

  // Candidate models to try in order of priority & speed
  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
  ];

  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const contents = [];
      const parts = [{ text: prompt }];

      if (imageBase64) {
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
            temperature: temperature || 0.85,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`[Gemini API] Model ${modelName} returned status ${response.status}: ${errorText}`);
        lastError = new Error(`Gemini API error (${response.status}): ${errorText}`);
        continue;
      }

      const data = await response.json();
      const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textOutput) {
        throw new Error('Không nhận được phản hồi từ AI');
      }

      try {
        return JSON.parse(textOutput);
      } catch (parseErr) {
        const jsonMatch = textOutput.match(/```json\s*([\s\S]*?)\s*```/) || textOutput.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1] || jsonMatch[0]);
        }
        throw new Error('Dữ liệu AI trả về không đúng định dạng JSON');
      }
    } catch (err) {
      console.log(`[Gemini API] Exception trying ${modelName}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Tất cả các mô hình AI hiện đang quá tải');
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

  if (!process.env.GEMINI_API_KEY) {
    return [
      { name: 'Thịt bò thăn', category: 'PROTEIN', quantity: '500g', storageLocation: 'CHILLED', suggestedDays: 2 },
      { name: 'Rau muống', category: 'VEGGIES', quantity: '1 bó', storageLocation: 'CHILLED', suggestedDays: 3 },
      { name: 'Trứng gà', category: 'DAIRY', quantity: '10 quả', storageLocation: 'CHILLED', suggestedDays: 10 },
      { name: 'Cà chua', category: 'VEGGIES', quantity: '4 quả', storageLocation: 'CHILLED', suggestedDays: 5 },
    ];
  }

  return await callGeminiFlash({ prompt, imageBase64, mimeType, temperature: 0.2 });
};

/**
 * Parse natural Vietnamese spoken voice / text prompt into structured pantry items
 */
const parseVoiceOrTextPrompt = async (text) => {
  if (!text || !text.trim()) return [];

  if (!process.env.GEMINI_API_KEY) {
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
    return await callGeminiFlash({ prompt, temperature: 0.2 });
  } catch (err) {
    console.log('Gemini text parse fallback to local rule engine:', err.message);
    const local = fallbackParseText(text);
    if (local.length > 0) return local;
    return [
      { name: text.trim().slice(0, 30), category: 'OTHER', quantity: '1 phần', storageLocation: 'CHILLED', suggestedDays: 4 },
    ];
  }
};

/**
 * Rich culinary dictionary for dynamic randomized weekly meal generation
 */
const BREAKFAST_POOL = [
  { name: 'Bánh mì ốp la xúc xích', note: 'Nhanh gọn 10p, giàu năng lượng', ingredients: ['Bánh mì', 'Trứng gà', 'Xúc xích', 'Dưa leo'] },
  { name: 'Phở bò tái lăn', note: 'Hương vị truyền thống thơm lừng', ingredients: ['Bánh phở', 'Thịt bò', 'Hành lá', 'Gừng'] },
  { name: 'Bún chả giò / Bún thịt nướng', note: 'Đổi vị đầu tuần tươi mát', ingredients: ['Bún tươi', 'Chả giò', 'Thịt heo', 'Rau sống'] },
  { name: 'Cháo sườn trứng bắc thảo', note: 'Ấm bụng sáng, dễ tiêu hóa', ingredients: ['Gạo tẻ', 'Sườn heo', 'Trứng bắc thảo', 'Hành lá'] },
  { name: 'Bánh cuốn chả lụa', note: 'Thanh đạm nhẹ nhàng', ingredients: ['Bánh cuốn', 'Chả lụa', 'Hành phi', 'Rau giá'] },
  { name: 'Mì tôm trứng thịt băm', note: 'Đậm đà 5 phút cấp tốc', ingredients: ['Mì tôm', 'Trứng gà', 'Thịt băm', 'Cải ngọt'] },
  { name: 'Hủ tiếu Nam Vang tôm thịt', note: 'Nước lèo ngọt thanh tự nhiên', ingredients: ['Hủ tiếu', 'Tôm tươi', 'Thịt heo', 'Hẹ lá'] },
  { name: 'Xôi gà xé nấm hương', note: 'No lâu, dẻo thơm nức mũi', ingredients: ['Nếp', 'Thịt gà', 'Nấm hương', 'Hành phi'] },
  { name: 'Bánh mì xíu mại sốt cà chua', note: 'Đậm đà chấm bánh mì nóng', ingredients: ['Bánh mì', 'Thịt băm', 'Cà chua', 'Hành tây'] },
  { name: 'Bún bò Huế gia truyền', note: 'Cay nồng đậm đà sảng khoái', ingredients: ['Bún sợi to', 'Bắp bò', 'Sả', 'Mắm ruốc'] },
  { name: 'Pancake chuối yến mạch', note: 'Eat clean healthy ít calo', ingredients: ['Yến mạch', 'Chuối', 'Trứng gà', 'Mật ong'] },
  { name: 'Bánh bao nhân thịt trứng cút', note: 'Tiện lợi mang đi làm', ingredients: ['Bánh bao', 'Trứng cút', 'Thịt nạc'] },
  { name: 'Nui xào bò sốt cà chua', note: 'Hấp dẫn, đủ chất cho cả nhà', ingredients: ['Nui', 'Thịt bò', 'Cà chua', 'Hành tây'] },
  { name: 'Cháo yến mạch ức gà xé', note: 'Giảm cân giữ dáng bổ dưỡng', ingredients: ['Yến mạch', 'Ức gà', 'Cà rốt', 'Hành hoa'] },
  { name: 'Bánh mì chảo thập cẩm', note: 'Trứng, pate, xúc xích béo ngậy', ingredients: ['Bánh mì', 'Trứng gà', 'Pate', 'Xúc xích', 'Bơ'] },
  { name: 'Bún riêu cua đồng', note: 'Vị chua thanh mộc mạc', ingredients: ['Bún tươi', 'Cua đồng', 'Đậu phụ', 'Cà chua', 'Rau sống'] },
];

const LUNCH_POOL = [
  { name: 'Thịt heo rang cháy cạnh + Canh cải ngọt thịt băm', note: 'Cơm trưa đậm đà đưa cơm', ingredients: ['Thịt ba chỉ', 'Thịt băm', 'Rau cải', 'Hành lá'] },
  { name: 'Gà xào sả ớt + Canh bí đao nấu tôm', note: 'Thơm nức mũi, thanh nhiệt', ingredients: ['Thịt gà', 'Sả', 'Ớt', 'Bí đao', 'Tôm tươi'] },
  { name: 'Bò xào cần tỏi + Canh chua cá lóc', note: 'Bổ sung chất sắt và vitamin', ingredients: ['Thịt bò', 'Cần tây', 'Tỏi', 'Cá lóc', 'Cà chua', 'Dứa'] },
  { name: 'Tôm rim mặn ngọt + Canh rau ngót thịt nạc', note: 'Vị ngọt mặn hài hòa hao cơm', ingredients: ['Tôm tươi', 'Hành tỏi', 'Rau ngót', 'Thịt nạc'] },
  { name: 'Cá basa kho tộ + Canh cua mồng tơi mướp', note: 'Chuẩn bữa cơm quê nhà', ingredients: ['Cá basa', 'Cua', 'Rau mồng tơi', 'Mướp'] },
  { name: 'Thịt kho tàu + Canh bắp cải cuộn thịt', note: 'Món ngon truyền thống', ingredients: ['Thịt ba chỉ', 'Trứng', 'Bắp cải', 'Thịt băm'] },
  { name: 'Sườn non xào chua ngọt + Canh sườn hầm củ quả', note: 'Vị chua ngọt hấp dẫn', ingredients: ['Sườn heo', 'Cà chua', 'Ớt chuông', 'Cà rốt', 'Khoai tây'] },
  { name: 'Mực xào dưa leo cà chua + Canh khổ qua nhồi thịt', note: 'Món biển giải nhiệt mát lành', ingredients: ['Mực', 'Dưa leo', 'Cà chua', 'Khổ qua', 'Thịt heo'] },
  { name: 'Đậu phụ nhồi thịt sốt cà chua + Canh rau muống luộc', note: 'Dễ làm, thanh mát trưa hè', ingredients: ['Đậu phụ', 'Thịt băm', 'Cà chua', 'Rau muống', 'Chanh'] },
  { name: 'Cá hồi áp chảo bơ tỏi + Salad rau củ mè rang', note: 'Omega-3 cao cấp ít tinh bột', ingredients: ['Cá hồi', 'Bơ', 'Tỏi', 'Xà lách', 'Cà chua bi'] },
  { name: 'Gà hấp lá chanh + Canh măng chua sườn non', note: 'Ngọt thịt thơm lá chanh', ingredients: ['Gà ta', 'Lá chanh', 'Măng chua', 'Sườn non'] },
  { name: 'Bò lúc lắc khoai tây + Canh rong biển đậu phụ', note: 'Món ngon hiện đại đậm vị', ingredients: ['Thịt bò', 'Khoai tây', 'Ớt chuông', 'Rong biển', 'Đậu hũ'] },
  { name: 'Thịt kho tiêu dưa cải + Canh bí đỏ thịt băm', note: 'Đậm vị ấm nồng', ingredients: ['Thịt heo', 'Dưa cải chua', 'Bí đỏ', 'Thịt băm'] },
];

const DINNER_POOL = [
  { name: 'Trứng chiên thịt băm cà chua + Canh rau dền nấu tôm', note: 'Bữa tối nhẹ bụng thanh mát', ingredients: ['Trứng gà', 'Thịt băm', 'Cà chua', 'Rau dền', 'Tôm'] },
  { name: 'Cá điêu hồng chiên xù mắm tỏi + Rau cải luộc', note: 'Giòn rụm chấm mắm chua ngọt', ingredients: ['Cá điêu hồng', 'Tỏi ớt', 'Rau cải ngọt'] },
  { name: 'Gỏi gà xé phay bắp cải + Canh gà lá giang', note: 'Eat clean nhẹ nhàng dễ ngủ', ingredients: ['Thịt gà', 'Bắp cải', 'Rau răm', 'Lá giang'] },
  { name: 'Thịt bò xào bông cải + Canh mồng tơi mướp hương', note: 'Giàu chất xơ và khoáng chất', ingredients: ['Thịt bò', 'Bông cải xanh', 'Mồng tơi', 'Mướp'] },
  { name: 'Đậu hũ sốt nấm thịt bằm + Canh rau củ', note: 'Thanh đạm, dễ tiêu buổi tối', ingredients: ['Đậu hũ', 'Nấm hương', 'Thịt băm', 'Cà rốt', 'Su su'] },
  { name: 'Cá ngừ kho dứa (thơm) + Canh chua dọc mùng', note: 'Vị chua ngọt đậm đà', ingredients: ['Cá ngừ', 'Dứa', 'Dọc mùng', 'Cà chua', 'Me'] },
  { name: 'Sườn rim mè mặn ngọt + Canh củ sen hầm sườn', note: 'Bổ dưỡng an thần', ingredients: ['Sườn heo', 'Mè trắng', 'Củ sen', 'Bắp ngọt'] },
  { name: 'Mực hấp gừng sả + Canh cải thìa thịt viên', note: 'Giữ trọn độ ngọt tự nhiên', ingredients: ['Mực tươi', 'Gừng', 'Sả', 'Cải thìa', 'Giò sống'] },
  { name: 'Cánh gà chiên nước mắm + Canh khoai mỡ tôm băm', note: 'Thơm lừng đậm đà màu sắc', ingredients: ['Cánh gà', 'Nước mắm', 'Tỏi', 'Khoai mỡ', 'Tôm'] },
  { name: 'Lẩu nấm gà lá é sum họp', note: 'Ấm cúng cuối tuần', ingredients: ['Thịt gà', 'Nấm các loại', 'Lá é', 'Bún tươi'] },
  { name: 'Bò cuộn nấm kim châm áp chảo + Canh cải cúc', note: 'Hương vị Nhật - Việt hài hòa', ingredients: ['Thịt bò ba chỉ', 'Nấm kim châm', 'Cải cúc'] },
  { name: 'Salad cá ngừ sốt mè rang + Bánh mì bơ tỏi', note: 'Bữa tối nhẹ nhàng chuẩn dáng', ingredients: ['Cá ngừ ngâm dầu', 'Xà lách', 'Cà chua', 'Bánh mì'] },
];

/**
 * Helper to shuffle and pick distinct items
 */
const shuffleArray = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * Generate fully dynamic, randomized 7-day meal plan
 */
const generateDynamicMealPlan = (pantryItems = []) => {
  const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
  
  // Shuffle pools randomly
  const bPool = shuffleArray(BREAKFAST_POOL);
  const lPool = shuffleArray(LUNCH_POOL);
  const dPool = shuffleArray(DINNER_POOL);

  const days = [];

  for (let i = 0; i < 7; i++) {
    const bDish = bPool[i % bPool.length];
    const lDish = lPool[i % lPool.length];
    const dDish = dPool[i % dPool.length];

    days.push({
      dayIndex: i,
      dayName: dayNames[i],
      meals: [
        {
          slot: 'breakfast',
          customDishName: bDish.name,
          note: bDish.note,
          ingredients: bDish.ingredients,
        },
        {
          slot: 'lunch',
          customDishName: lDish.name,
          note: lDish.note,
          ingredients: lDish.ingredients,
        },
        {
          slot: 'dinner',
          customDishName: dDish.name,
          note: dDish.note,
          ingredients: dDish.ingredients,
        },
      ],
    });
  }

  return days;
};

/**
 * AI Suggest 7-day Meal Plan based on available pantry items and healthy balance
 */
const suggestWeeklyMealPlan = async ({ pantryItems = [], targetDays = 7, preferences = '' }) => {
  const pantrySummary = pantryItems.length > 0
    ? pantryItems.map((p) => `${p.name} (SL: ${p.quantity}, vị trí: ${p.storageLocation})`).join(', ')
    : 'Chưa có thực phẩm nào trong tủ lạnh';

  const randomThemes = [
    'Phong vị ẩm thực gia đình 3 miền đậm đà, đổi vị mỗi ngày',
    'Thanh đạm, Eat-Clean, nhiều rau xanh và củ quả tươi mát',
    'Tiết kiệm tối đa nguyên liệu có sẵn, nấu nhanh gọn dưới 30 phút',
    'Dinh dưỡng tăng cường Protein, ít dầu mỡ, chuẩn dáng',
    'Các món mặn đưa cơm, canh ngọt mát lành đặc trưng Việt Nam',
  ];
  const chosenTheme = randomThemes[Math.floor(Math.random() * randomThemes.length)];
  const randomSeed = Date.now();

  const prompt = `
Bạn là chuyên gia dinh dưỡng và đầu bếp trưởng của ứng dụng "Vét Tủ".
Hãy lên thực đơn ăn uống NGẪU NHIÊN, MỚI LẠ VÀ ĐỘC ĐÁO cho 7 ngày (từ Thứ 2 đến Chủ Nhật).
Chủ đề tuần này: "${chosenTheme}" (Phiên bản gợi ý #${randomSeed}).
Mỗi ngày gồm 3 bữa chính: Bữa sáng (breakfast), Bữa trưa (lunch), Bữa tối (dinner).

Nguyên liệu người dùng ĐANG CÓ TRONG TỦ LẠNH (ưu tiên tận dụng khéo léo):
${pantrySummary}

${preferences ? `Yêu cầu thêm từ người dùng: ${preferences}` : ''}

YÊU CẦU ĐẶC BIỆT:
- Tạo các món ăn phong phú, KHÔNG ĐƯỢC LẶP LẠI đơn điệu giữa các ngày.
- Bữa sáng nhanh gọn hoặc các món bún/phở/bánh mì quen thuộc.
- Bữa trưa và Bữa tối kết hợp chuẩn món mặn + món canh/rau (VD: "Gà xào sả ớt + Canh bí đao").

Nhiệm vụ:
Tạo kế hoạch 7 ngày (dayIndex từ 0 đến 6 tương ứng Thứ 2 đến Chủ Nhật).
Trả về DUY NHẤT một mảng JSON (Array) gồm 7 phần tử theo đúng định dạng sau:
[
  {
    "dayIndex": 0,
    "dayName": "Thứ 2",
    "meals": [
      {
        "slot": "breakfast",
        "customDishName": "Tên món sáng",
        "note": "Ghi chú ngắn",
        "ingredients": ["Nguyên liệu 1", "Nguyên liệu 2"]
      },
      {
        "slot": "lunch",
        "customDishName": "Tên món mặn + Tên món canh",
        "note": "Ghi chú ngắn",
        "ingredients": ["Nguyên liệu 1", "Nguyên liệu 2"]
      },
      {
        "slot": "dinner",
        "customDishName": "Tên món tối + Canh/rau",
        "note": "Ghi chú ngắn",
        "ingredients": ["Nguyên liệu 1", "Nguyên liệu 2"]
      }
    ]
  }
]
Chỉ trả về JSON thuần túy, không có giải thích hay markdown code fence.
`;

  if (!process.env.GEMINI_API_KEY) {
    return generateDynamicMealPlan(pantryItems);
  }

  try {
    const aiResult = await callGeminiFlash({ prompt, temperature: 0.9 });
    if (Array.isArray(aiResult) && aiResult.length === 7) {
      return aiResult;
    }
    return generateDynamicMealPlan(pantryItems);
  } catch (err) {
    console.log('[AI Meal Planner] Gemini temporarily busy, generated via dynamic culinary engine:', err.message);
    return generateDynamicMealPlan(pantryItems);
  }
};

module.exports = {
  scanFoodOrReceiptImage,
  parseVoiceOrTextPrompt,
  suggestWeeklyMealPlan,
};

