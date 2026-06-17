import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be set in production");
  }

  return "postgresql://todo:todo@localhost:5433/todo";
}

const client = postgres(resolveDatabaseUrl(), { max: 10 });

export const db = drizzle(client, { schema });
