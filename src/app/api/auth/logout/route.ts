import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/jwt";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearAuthCookie());
  return response;
}
