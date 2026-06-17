import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { defineConfig } from "drizzle-kit";

for (const file of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) {
      process.env[key] = trimmed.slice(eq + 1).trim();
    }
  }
  break;
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://todo:todo@localhost:5433/todo",
  },
});
