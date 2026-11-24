import { NextFunction, Request, RequestHandler, Response } from "express";
import rateLimit from "express-rate-limit";
import firebaseTokenVerify from "./firebaseTokenVerify";

/**
 * Per-user rate limits with separate buckets, so autosave traffic can never starve reads or AI calls
 * (and the other way round). Every limiter keys on `req.user_id`, so each must run AFTER
 * `firebaseTokenVerify`; the `authenticated*` chains below do that.
 *
 * Counters live in memory per process. That is fine for the single backend instance used today;
 * run more than one and each instance counts separately.
 */
export const createUserLimiter = (windowMs: number, limit: number, message: string): RequestHandler =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.user_id ?? req.ip ?? "unknown",
    message: { message },
  });

// Reads: lists, search, document data, chats, members, profile.
export const readLimiter = createUserLimiter(60 * 1000, 240, "Too many requests, please slow down.");
// Saves and other writes. Autosave debounces at 1 s (up to ~60/min), so leave headroom for sync and tags.
export const saveLimiter = createUserLimiter(60 * 1000, 120, "Too many saves, please slow down.");
// AI edit and chat calls. Each can cost tokens, so this bucket is small.
export const aiLimiter = createUserLimiter(5 * 60 * 1000, 20, "You have reached the AI request limit. Please try again in a few minutes.");

/** Verify the Firebase token, then count the request in the matching bucket. */
export const authenticatedRead: RequestHandler[] = [firebaseTokenVerify, readLimiter];
export const authenticatedSave: RequestHandler[] = [firebaseTokenVerify, saveLimiter];
export const authenticatedAi: RequestHandler[] = [firebaseTokenVerify, aiLimiter];

/** For routers that already ran `firebaseTokenVerify`: GET and HEAD count as reads, everything else as a save. */
export const limitByMethod = (req: Request, res: Response, next: NextFunction) =>
  (req.method === "GET" || req.method === "HEAD" ? readLimiter : saveLimiter)(req, res, next);

/**
 * Per-IP backstop for unauthenticated abuse. It only counts failed responses (401, 400, 404, 429...),
 * so many legitimate users sharing one address are not throttled by each other's normal traffic.
 */
export const failedRequestLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many failed requests, please try again later." },
});

/**
 * Parses `TRUST_PROXY`: a hop count ("1" for one reverse proxy), or a list of proxy addresses/CIDRs.
 * Unset or "false" means do not trust forwarded headers. "true" is rejected because it trusts any
 * client-supplied X-Forwarded-For, which lets a caller pick its own rate-limit key.
 */
export const parseTrustProxy = (value: string | undefined): false | number | string => {
  const raw = value?.trim();
  if (!raw || raw.toLowerCase() === "false") return false;
  if (raw.toLowerCase() === "true") {
    throw new Error("TRUST_PROXY=true trusts every client-supplied X-Forwarded-For. Use a hop count (for example 1) or proxy addresses.");
  }
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
};
