// Hàm server (Vercel) nhận ảnh mặt bằng từ trình duyệt, gọi Gemini và trả về JSON.
// API key chỉ nằm ở biến môi trường GEMINI_API_KEY trên Vercel, không bao giờ gửi xuống trình duyệt.

const PROMPT = `You are reading an architectural floor plan image with Vietnamese labels. Return ONLY one JSON object:
{"kind":"nha_dat|can_ho","front":"left|right|top|bottom","north":null,"outline":[[x,y],...],"items":[{"type":"...","label":"...","x":0,"y":0,"dir":"up|down|left|right|null"}]}
All coordinates are integers 0-1000: x relative to image width, y relative to image height.
- outline: polygon (4-10 points, clockwise) of the ROOFED building footprint of this floor. Exclude open yards, gardens, open balconies/terraces, car parking outside walls, dimension lines, title blocks and grid axes.
- kind: can_ho if this is an apartment unit in a building (has a unit entrance from a corridor/lobby), else nha_dat.
- front: side of the drawing where the main entrance door of the house / apartment is.
- north: if the drawing shows a compass or north arrow, the direction it points as degrees clockwise from straight up on the image (0-359); otherwise null.
- items types: cua_chinh (main entrance door of the house or apartment), cong (gate), cua_sau (back door), ban_cong (balcony or loggia: point at its middle), bep (cooking hob: put the point on the burners), ban_tho (altar, "bàn thờ"), phong_ngu (bedroom: point at the room centre), wc (toilet/bathroom), kho (storage), giat (laundry/washing machine), cau_thang (stairs), be_phot (septic tank), gieng (well/water tank).
- For bep, dir = the drawing direction the cook's BACK faces while cooking (away from the wall the hob stands against). For ban_tho, dir = direction the altar faces. Otherwise null.
- label: short Vietnamese room name as written on the plan, if any.`;

// Thử lần lượt: model trong biến môi trường, rồi các model dự phòng nếu model cũ bị Google ngừng.
const MODELS = [process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-flash-latest'].filter(Boolean);
const LIMIT = Number(process.env.AI_LIMIT_PER_10MIN || 6); // số lượt mỗi IP trong 10 phút
const DAILY = Number(process.env.AI_DAILY_CAP || 300);     // trần lượt mỗi ngày cho một phiên máy chủ
const MAX_B64 = 3_500_000;                                  // khoảng 2,6 MB ảnh

// Bộ đếm trong bộ nhớ: đủ dùng giai đoạn thử nghiệm (reset khi Vercel khởi động lại hàm).
const hits = new Map();
let day = '', dayCount = 0;

function tooMany(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  if (list.length >= LIMIT) { hits.set(ip, list); return true; }
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

function parseJson(text) {
  const t = String(text || '').trim();
  try { return JSON.parse(t); } catch (e) {}
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch (e) {} }
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {} }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ code: 'method' });

  // Chỉ nhận yêu cầu từ chính trang web này
  const origin = req.headers.origin;
  if (origin) {
    try { if (new URL(origin).host !== req.headers.host) return res.status(403).json({ code: 'origin' }); }
    catch (e) { return res.status(403).json({ code: 'origin' }); }
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ code: 'no_key' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'x').split(',')[0].trim();
  if (tooMany(ip)) return res.status(429).json({ code: 'rate_limited' });
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; dayCount = 0; }
  if (++dayCount > DAILY) return res.status(429).json({ code: 'quota' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const image = body && typeof body.image === 'string' ? body.image : '';
  if (!image || !/^[A-Za-z0-9+/=]+$/.test(image.slice(0, 200))) return res.status(400).json({ code: 'bad_image' });
  if (image.length > MAX_B64) return res.status(413).json({ code: 'too_large' });

  const payload = {
    contents: [{ role: 'user', parts: [{ inline_data: { mime_type: 'image/jpeg', data: image } }, { text: PROMPT }] }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  };

  let lastErr = 'gemini';
  for (const model of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(payload),
      });
      if (r.status === 404) { lastErr = 'model_not_found'; continue; }
      if (r.status === 429) return res.status(429).json({ code: 'quota' });
      if (!r.ok) { lastErr = 'gemini_' + r.status; console.error('Gemini', model, r.status, (await r.text()).slice(0, 300)); continue; }
      const data = await r.json();
      const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
      const result = parseJson(text);
      if (!result || !Array.isArray(result.items)) return res.status(502).json({ code: 'invalid_json' });
      return res.status(200).json({ result, model });
    } catch (e) {
      lastErr = 'network'; console.error('Gemini error', model, e && e.message);
    }
  }
  return res.status(502).json({ code: lastErr });
};

