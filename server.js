import express from "express";
import multer from "multer";
import Tesseract from "tesseract.js";

const app = express();
const upload = multer();

app.post("/ocr", upload.single("file"), async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ error: "Missing file" });

    // Screenshots غالباً EN/Numbers كفاية
    const { data } = await Tesseract.recognize(req.file.buffer, "eng", {
      logger: () => {},
    });

    const text = (data?.text || "").trim();
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.listen(4000, () => console.log("OCR service: http://localhost:4000"));