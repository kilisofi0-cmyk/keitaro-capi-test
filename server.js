import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 🟢 Test endpoint
app.get("/", (req, res) => {
  res.send("Render server is LIVE and CAPI ready!");
});

// 🟡 Test capture endpoint
app.get("/capi", (req, res) => {
  console.log("TEST EVENT:", req.query);
  res.json({ status: "ok", received: req.query });
});

// 🔥 MAIN Facebook CAPI endpoint
app.post("/fb", async (req, res) => {
  console.log("Incoming CAPI event:", req.body);

  const pixel_id = process.env.FB_PIXEL;
  const access_token = process.env.FB_TOKEN;

  if (!pixel_id || !access_token) {
    return res.status(500).json({
      error: "Missing Facebook Pixel ID or Access Token in environment variables"
    });
  }

  const url = `https://graph.facebook.com/v18.0/${pixel_id}/events?access_token=${access_token}`;

  try {
    const fbPayload = {
      data: [
        {
          event_name: req.body.event_name || "Lead",
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: req.body.event_source_url || "",
          user_data: {
            client_ip_address: req.body.client_ip,
            client_user_agent: req.body.ua,
            em: req.body.email,
            ph: req.body.phone
          },
          custom_data: req.body.custom_data || {}
        }
      ],
      test_event_code: req.body.test_event_code || undefined
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fbPayload)
    });

    const result = await response.json();
    console.log("Facebook response:", result);

    res.json(result);
  } catch (error) {
    console.error("CAPI ERROR:", error);
    res.status(500).json({ error: "CAPI send failed", details: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
