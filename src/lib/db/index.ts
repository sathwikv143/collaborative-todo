import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";

type AppDatabase = PostgresJsDatabase<typeof schema>;

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;

  // Next.js imports API route modules during `next build`; no DB is available then.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "postgresql://build:build@127.0.0.1:5432/build";
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be set in production");
  }

  return "postgresql://todo:todo@localhost:5433/todo";
}

let client: Sql | undefined;
let database: AppDatabase | undefined;

function getDatabase(): AppDatabase {
  if (!database) {
    client = postgres(resolveDatabaseUrl(), { max: 10 });
    database = drizzle(client, { schema });
  }
  return database;
}

/** Lazy DB handle — safe to import during `next build` without a live database. */
export const db = new Proxy({} as AppDatabase, {
  get(_target, prop, receiver) {
    const instance = getDatabase();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
