import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const maxAttempts = 30;
const delayMs = 1000;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  let client;
  try {
    client = postgres(url, { max: 1, connect_timeout: 5 });
    await client`SELECT 1`;
    console.log("Database is ready");
    process.exit(0);
  } catch (err) {
    if (attempt === maxAttempts) {
      console.error(`Database not ready after ${maxAttempts} attempts:`, err.message);
      process.exit(1);
    }
    console.log(`Attempt ${attempt}/${maxAttempts} — database not ready, retrying...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  } finally {
    if (client) await client.end({ timeout: 1 }).catch(() => {});
  }
}
