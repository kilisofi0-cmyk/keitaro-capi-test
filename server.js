import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Проверка сервера
app.get("/", (req, res) => {
  res.send("CAPI server is running.");
});

// === MAIN CAPI endpoint ===
app.get("/capi", async (req, res) => {
  const { event, subid, amount, fbclid, ua, ip, test_event_code } = req.query;

  console.log("📩 Incoming:", req.query);

  if (!event || !subid) {
    return res.status(400).json({ error: "Missing event or subid" });
  }

  // Определяем название события Facebook
  let fbEventName = "";
  if (event === "reg") fbEventName = "CompleteRegistration";
  if (event === "sale") fbEventName = "Purchase";

  if (!fbEventName) {
    return res.status(400).json({ error: "Unknown event type" });
  }

  // ===========================
  // 🧩 fbc (обязательный параметр, если есть fbclid)
  // ===========================

  let fbc = null;
  if (fbclid) {
    fbc = `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}`;
  }

  // USER DATA
  const user_data = {
    external_id: subid,
    client_user_agent: ua || req.headers["user-agent"] || "Unknown-UA",
    client_ip_address: ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress,
  };

  if (fbc) user_data.fbc = fbc;

  // CUSTOM DATA
  const custom_data = {
    currency: "USD",
    value: amount ? Number(amount) : 0,
  };

  // Полезная нагрузка
  const payload = {
    data: [
      {
        event_name: fbEventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        user_data,
        custom_data,
      }
    ]
  };

  // Для тестовых событий FB
  if (test_event_code) {
    payload.test_event_code = test_event_code;
  }

  try {
    const fbResponse = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.FB_PIXEL}/events?access_token=${process.env.FB_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const result = await fbResponse.json();
    console.log("📤 FB Response:", result);

    res.json({ status: "OK", fb: result });
  } catch (err) {
    console.error("❌ Error sending to FB:", err);
    res.status(500).json({ error: "FB send failed", details: err });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



