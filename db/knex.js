const path = require("path");
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
}

module.exports = { knex, initializeDatabase };
