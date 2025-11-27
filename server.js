import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

// ТВОИ данные
const PIXEL_ID = "1533254694385595";
const ACCESS_TOKEN = "EAAjuGVB95A0BQLWnc0TlR8C7qG7I0jxsYttE5SoGQIVx74jZAJKDgR7ZCp8ulYSZAl6NBVfZCcsWfVPKrthlTwC2K8ioIwBwudEfmFDKxY0Evy95s5M5NTuAwO4issb4UNJeZBhX3Wrj6LVXRfZBDYCKFJyZBOD1eBTtBjv4Y2MTiVZBlh60f2YApaEANTIIkwZDZD";

app.get("/capi", async (req, res) => {
  const { event, subid, amount, fbclid, ua, ip, test_event_code } = req.query;

  console.log("📩 Incoming:", req.query);

  if (!event || !subid) {
    return res.json({ status: "error", message: "Missing event or subid" });
  }

  // Определяем событие
  let event_name = event === "sale" ? "Purchase" : "CompleteRegistration";

  // Подготовка данных для FB
  let payload = {
    data: [
      {
        event_name,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",

        user_data: {
          fbclid: fbclid || undefined,
          client_user_agent: ua || undefined,
          client_ip_address: ip || undefined,
        },

        event_source_url: "https://spinbetera.com/",

        custom_data: {}
      },
    ],
    access_token: ACCESS_TOKEN,
  };

  // Добавляем value/currency только если Purchase
  if (event_name === "Purchase") {
    const value = parseFloat(amount) || 0; // amount = {depositAmount}
    payload.data[0].custom_data = {
      currency: "USD",
      value: value,
    };
  }

  // Тестовый код (если есть)
  if (test_event_code) {
    payload.test_event_code = test_event_code;
  }

  // Отправка в Facebook
  const fbURL = `https://graph.facebook.com/v17.0/${PIXEL_ID}/events`;

  let fbResponse = await fetch(fbURL, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

  fbResponse = await fbResponse.json();
  console.log("📨 FB Response:", fbResponse);

  return res.json({ status: "OK", fb: fbResponse });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
