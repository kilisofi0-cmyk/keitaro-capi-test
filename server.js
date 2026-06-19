import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 10000;

const PIXEL_ID = process.env.PIXEL_ID || "979608831100451";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || "EAApZBHgE1EpIBRThPY9CuZCEZCMiSM8CxfXhaMXtu28rE8C8cV49md8dJZBbtL1jI2mMmVcCEFyfUvQoEG61xxvHZBSDIKZBEmVrbKQZAqGpZAfaNP1oaoAvDUvtjQmzfMrPZCNYFxlfp6XHH43zUAXK5pnxivai7yU8ZB2a0YMQ0XX43I0mm4dSa8xbcipacQ9QZDZD";
const API_VERSION = "v21.0";

const hash = (value) =>
  value ? crypto.createHash("sha256").update(String(value).trim().toLowerCase()).digest("hex") : undefined;
const isReal = (val) => val && !val.includes("{") && val.trim() !== "";

app.get("/capi", async (req, res) => {
  // deposit_id - уникальный id депозита (tid из Кейтаро / deposit_id из Affilka)
  const { event, subid, amount, deposit_id, fbclid, fbp, ua, ip, landing, test_event_code } = req.query;
  console.log("Входящий постбек:", req.query);

  if (!subid) {
    return res.status(400).json({ status: "error", message: "Missing subid" });
  }

  let cleanDomain = "orbitflow.lol";
  if (isReal(landing)) {
    cleanDomain = landing.replace(/^https?:\/\//, "").split("/")[0];
  }
  const event_source_url = `https://${cleanDomain}/`;

  const fbc = isReal(fbclid)
    ? `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}`
    : undefined;

  // --- Тип события ---
  // deposit = любой депозит (включая первый) -> Purchase. Это основной сигнал для FB.
  // sale    = первый депозит -> в FB как Purchase НЕ шлём (чтобы не задвоить),
  //           но обрабатываем мягко: помечаем и не отправляем покупку.
  // остальное -> CompleteRegistration.
  //
  // Логика: в FB ценность депозитов доходит ТОЛЬКО через event=deposit.
  // Так каждый деп уходит один раз, value не задваивается.

  // Первый деп (sale) в FB как покупку не отправляем — пропускаем,
  // чтобы избежать двойного счёта (первый деп всё равно придёт через deposit).
  if (event === "sale") {
    console.log(`SKIP sale для ${subid} (первый деп придёт через deposit, не задваиваем)`);
    return res.json({ status: "skipped_sale", reason: "first deposit counted via deposit event" });
  }

  let event_name;
  if (event === "deposit") {
    event_name = "Purchase";
  } else {
    event_name = "CompleteRegistration";
  }
  const isPurchase = event_name === "Purchase";

  // --- Уникальность события ---
  // Депозиты: уникальный event_id на каждый деп через deposit_id,
  // иначе FB схлопнет повторные депы как дубли.
  let event_id;
  if (event === "deposit") {
    if (isReal(deposit_id)) {
      event_id = `${subid}_deposit_${deposit_id}`;
    } else {
      event_id = `${subid}_deposit_${Math.floor(Date.now() / 1000)}`;
    }
  } else {
    event_id = `${subid}_${event_name}`;
  }

  const user_data = {
    client_user_agent: ua || undefined,
    client_ip_address: ip || undefined,
    external_id: hash(subid),
    fbc: fbc,
    fbp: isReal(fbp) ? fbp : undefined,
  };
  Object.keys(user_data).forEach((k) => user_data[k] === undefined && delete user_data[k]);

  const eventData = {
    event_name,
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    event_id,
    event_source_url,
    user_data,
    custom_data: isPurchase
      ? { currency: "USD", value: parseFloat(amount) || 0 }
      : { content_name: "registration" },
  };

  const payload = { data: [eventData] };
  if (isReal(test_event_code)) {
    payload.test_event_code = test_event_code;
  }

  try {
    const fbURL = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
    const response = await fetch(fbURL, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    const result = await response.json();

    if (result.error) {
      console.error(`FB error для ${subid}:`, result.error);
      return res.status(400).json({ status: "fb_error", fb: result });
    }

    console.log(`OK ${event_name} (${event}) для ${subid} value=${amount} eid=${event_id}: events_received=${result.events_received}`);
    return res.json({ status: "OK", event: event_name, event_id, fb: result });
  } catch (error) {
    console.error("Ошибка отправки:", error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

app.get("/", (req, res) => res.json({ status: "alive" }));

app.listen(PORT, () => console.log(`CAPI сервер на порту ${PORT}`));
