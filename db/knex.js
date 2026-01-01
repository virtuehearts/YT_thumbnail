const path = require("path");
const fs = require("fs");
const knexLib = require("knex");

const knex = knexLib({
  client: "sqlite3",
  connection: {
    filename: path.join(__dirname, "database.sqlite")
  },
  useNullAsDefault: true
});

async function initializeDatabase() {
  const hasTable = await knex.schema.hasTable("templates");
  if (!hasTable) {
    await knex.schema.createTable("templates", (table) => {
      table.increments("id").primary();
      table.string("name").notNullable();
      table.string("main_title").notNullable();
      table.string("left_caption").notNullable();
      table.string("right_caption").notNullable();
      table.string("primary_color").notNullable();
      table.integer("font_size").notNullable();
      table.timestamps(true, true);
    });
  }

  const hasStylePresets = await knex.schema.hasTable("style_presets");
  if (!hasStylePresets) {
    await knex.schema.createTable("style_presets", (table) => {
      table.increments("id").primary();
      table.string("name").notNullable();
      table.string("primary_color").notNullable();
      table.integer("font_size").notNullable();
      table.integer("banner_height").notNullable();
      table.integer("panel_height").notNullable();
      table.integer("panel_margin").notNullable();
      table.integer("panel_padding").notNullable();
      table.integer("panel_gap").notNullable();
      table.integer("divider_width").notNullable();
      table.integer("divider_opacity").notNullable();
      table.timestamps(true, true);
    });
  }

  const hasJsonTemplates = await knex.schema.hasTable("json_templates");
  if (!hasJsonTemplates) {
    await knex.schema.createTable("json_templates", (table) => {
      table.increments("id").primary();
      table.string("name").notNullable();
      table.string("content_type").notNullable();
      table.text("template_json").notNullable();
      table.text("vars_json").notNullable();
      table.timestamps(true, true);
    });
  }

  const countRow = await knex("templates").count({ total: "id" }).first();
  const total = Number(countRow.total || 0);

  if (total === 0) {
    await knex("templates").insert([
      {
        name: "Tech Comparison",
        main_title: "MAC VS PC",
        left_caption: "Speed. Power. Clean UI.",
        right_caption: "Budget build. Lag. Pop-ups.",
        primary_color: "#ff4d4f",
        font_size: 64
      },
      {
        name: "Fitness Before/After",
        main_title: "90-DAY TRANSFORM",
        left_caption: "Before: low energy",
        right_caption: "After: lean & strong",
        primary_color: "#16a34a",
        font_size: 64
      },
      {
        name: "Financial Era",
        main_title: "BIG MONEY ERA",
        left_caption: "Paying off debt",
        right_caption: "Investing monthly",
        primary_color: "#f59e0b",
        font_size: 64
      }
    ]);
  }

  const presetCount = await knex("style_presets").count({ total: "id" }).first();
  const presetTotal = Number(presetCount.total || 0);

  if (presetTotal === 0) {
    await knex("style_presets").insert([
      {
        name: "Bold Contrast",
        primary_color: "#4f46e5",
        font_size: 68,
        banner_height: 120,
        panel_height: 220,
        panel_margin: 32,
        panel_padding: 18,
        panel_gap: 20,
        divider_width: 8,
        divider_opacity: 140
      },
      {
        name: "Warm Pop",
        primary_color: "#f97316",
        font_size: 62,
        banner_height: 110,
        panel_height: 210,
        panel_margin: 28,
        panel_padding: 16,
        panel_gap: 16,
        divider_width: 6,
        divider_opacity: 120
      }
    ]);
  }

  const jsonTemplateCount = await knex("json_templates").count({ total: "id" }).first();
  const jsonTemplateTotal = Number(jsonTemplateCount.total || 0);

  if (jsonTemplateTotal === 0) {
    const templatesDir = path.join(__dirname, "..", "assets", "templates");
    const templatePairs = [
      {
        name: "Split Screen Classic",
        content_type: "comparison",
        templateFile: "split_screen_classic.json",
        varsFile: "vars_split_screen_classic.json"
      },
      {
        name: "VRAM Tax",
        content_type: "product_launch",
        templateFile: "vram_tax.json",
        varsFile: "vars_vram_tax.json"
      },
      {
        name: "Announcement Spotlight",
        content_type: "announcement",
        templateFile: "announcement_spotlight.json",
        varsFile: "vars_announcement_spotlight.json"
      }
    ];

    const payloads = templatePairs.map((entry) => {
      const templatePath = path.join(templatesDir, entry.templateFile);
      const varsPath = path.join(templatesDir, entry.varsFile);
      const templateJson = fs.readFileSync(templatePath, "utf-8");
      const varsJson = fs.readFileSync(varsPath, "utf-8");
      return {
        name: entry.name,
        content_type: entry.content_type,
        template_json: templateJson,
        vars_json: varsJson
      };
    });

    await knex("json_templates").insert(payloads);
  }
}

module.exports = { knex, initializeDatabase };
