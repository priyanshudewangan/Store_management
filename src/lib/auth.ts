import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "kirana-pos-super-secret-key-123456";

export interface JWTPayload {
  id: string;
  username: string;
  name: string;
  role: "admin" | "cashier";
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

export function getUserFromRequest(req: NextRequest): JWTPayload | null {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function checkAdmin(req: NextRequest): boolean {
  const user = getUserFromRequest(req);
  return user?.role === "admin";
}
