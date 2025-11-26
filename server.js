import express from "express";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Test endpoint
app.get("/", (req, res) => {
  res.send("Render server is working!");
});

// Endpoint for Keitaro → CAPI test
app.get("/capi", (req, res) => {
  console.log("Received event:", req.query);
  res.json({ status: "ok", received: req.query });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
