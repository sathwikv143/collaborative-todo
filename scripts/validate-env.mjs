const isProd = process.env.NODE_ENV === "production";

if (!process.env.DATABASE_URL) {
  if (isProd) {
    console.error("DATABASE_URL must be set in production");
    process.exit(1);
  }
} else if (isProd && /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)) {
  console.warn("Warning: DATABASE_URL points at localhost in production");
}

const secret = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
if (isProd && secret === "dev-secret-change-in-production") {
  console.error("JWT_SECRET must be set to a strong random value in production");
  process.exit(1);
}

if (isProd && !process.env.APP_URL) {
  console.error("APP_URL must be set in production (required for WebAuthn)");
  process.exit(1);
}

console.log("Environment validation passed");
