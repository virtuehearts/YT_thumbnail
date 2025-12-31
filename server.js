const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const { spawn } = require("child_process");
const crypto = require("crypto");
const { knex, initializeDatabase } = require("./db/knex");

const app = express();
const PORT = process.env.PORT || 3000;

const publicDir = path.join(__dirname, "public");
const outputDir = path.join(publicDir, "output");
const uploadDir = path.join(publicDir, "uploads");

for (const dir of [publicDir, outputDir, uploadDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(publicDir));
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || ".jpg");
    const name = `${crypto.randomUUID()}${ext}`;
    cb(null, name);
  }
});

const upload = multer({ storage });

app.get("/", (_req, res) => {
  res.redirect("/edit");
});

app.get("/edit", async (_req, res) => {
  const templates = await knex("templates").select("*").orderBy("id");
  res.render("edit", { templates });
});

app.post("/generate", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image upload is required." });
    }

    const {
      main_title,
      left_caption,
      right_caption,
      primary_color,
      font_size
    } = req.body;

    const outputFile = `${crypto.randomUUID()}.jpg`;
    const outputPath = path.join(outputDir, outputFile);

    const payload = {
      image_path: req.file.path,
      output_path: outputPath,
      main_title,
      left_caption,
      right_caption,
      primary_color,
      font_size: Number(font_size)
    };

    const pythonProcess = spawn("python3", [
      path.join(__dirname, "python", "generate_thumbnail.py")
    ]);

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: stderr || "Image generation failed." });
      }

      try {
        const response = JSON.parse(stdout);
        return res.json({
          output: `/output/${path.basename(response.output_path)}`
        });
      } catch (error) {
        return res.status(500).json({ error: "Invalid response from image generator." });
      }
    });

    pythonProcess.stdin.write(JSON.stringify(payload));
    pythonProcess.stdin.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
  });
