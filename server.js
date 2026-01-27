import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

const PIXEL_ID = "1533254694385595";
const ACCESS_TOKEN = "EAAjuGVB95A0BQLWnc0TlR8C7qG7I0jxsYttE5SoGQIVx74jZAJKDgR7ZCp8ulYSZAl6NBVfZCcsWfVPKrthlTwC2K8ioIwBwudEfmFDKxY0Evy95s5M5NTuAwO4issb4UNJeZBhX3Wrj6LVXRfZBDYCKFJyZBOD1eBTtBjv4Y2MTiVZBlh60f2YApaEANTIIkwZDZD";

app.get("/capi", async (req, res) => {
  // Добавляем параметр landing для получения текущего домена
  const { event, subid, amount, fbclid, ua, ip, landing, test_event_code } = req.query;

  console.log("📩 Входящий постбек:", req.query);

  if (!subid) {
    return res.json({ status: "error", message: "Missing subid" });
  }

  // 1. Определяем тип события
  const event_name = (event === "sale" || event === "lead") ? "Purchase" : "CompleteRegistration";

  // 2. Чистим сумму (валидация для Purchase)
  let cleanAmount = parseFloat(amount);
  if (isNaN(cleanAmount)) cleanAmount = 0;

  // 3. Собираем FBC в правильном формате
  const fbc = fbclid ? `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}` : undefined;

  // 4. Динамический домен (берем из параметра landing, если его нет — используем базовый)
  const event_url = landing ? `https://${landing}/` : "https://betterspin.online/";

  const payload = {
    data: [
      {
        event_name: event_name,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_id: subid, // subid как уникальный ключ для дедупликации
        event_source_url: event_url, 
        
        user_data: {
          client_user_agent: ua || undefined,
          client_ip_address: ip || undefined,
          external_id: subid,
          fbc: fbc,
        },

        custom_data: event_name === "Purchase" ? {
          currency: "USD",
          value: cleanAmount,
        } : {},
      },
    ],
  };

  if (test_event_code) {
    payload.test_event_code = test_event_code;
  }

  try {
    const fbURL = `https://graph.facebook.com/v17.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
    const response = await fetch(fbURL, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();
    console.log(`📨 Ответ FB для ${subid}:`, result);
    return res.json({ status: "OK", fb: result });
  } catch (error) {
    console.error("❌ Ошибка:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
