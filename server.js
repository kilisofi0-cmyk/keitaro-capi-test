import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Проверка — жив ли сервер
app.get("/", (req, res) => {
  res.send("CAPI server is running.");
});

// === MAIN CAPI endpoint ===
app.get("/capi", async (req, res) => {
  const { event, subid, amount } = req.query;

  console.log("📩 Incoming:", req.query);

  if (!event || !subid) {
    return res.status(400).json({ error: "Missing event or subid" });
  }

  // Определяем название события для Facebook
  let fbEventName = "";
  if (event === "reg") fbEventName = "CompleteRegistration";
  if (event === "sale") fbEventName = "Purchase";

  if (!fbEventName) {
    return res.status(400).json({ error: "Unknown event type" });
  }

  // Собираем payload для Facebook CAPI
  const payload = {
    data: [
  {
    event_name: fbEventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: fbEventName === "CompleteRegistration" ? "website" : "server",

    user_data: {
      client_user_agent: req.headers["user-agent"] || "Keitaro-Server",
      external_id: subid
    },

    custom_data: {
      currency: "USD",
      value: amount ? Number(amount) : 0
    }
  }
]


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


// Render автоматически подставит PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
