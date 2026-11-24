const { test } = require("node:test");
const assert = require("node:assert/strict");
// firebaseConfig initializes the Admin SDK on import; dummy values are enough because no token is verified here.
process.env.FIREBASE_PROJECT_ID ||= "test";
process.env.FIREBASE_CLIENT_EMAIL ||= "test@test.iam.gserviceaccount.com";
process.env.FIREBASE_PRIVATE_KEY ||= require("node:crypto").generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" });
const express = require("express");
const { readLimiter, saveLimiter, aiLimiter, limitByMethod, failedRequestLimiter, parseTrustProxy } = require("../dist/Middlewares/rateLimits");

// A stand-in for firebaseTokenVerify: the user comes from a header, then the real limiters run.
const fakeAuth = (req, _res, next) => { req.user_id = req.get("x-user"); next(); };
const start = async configure => {
  const app = express();
  app.use(express.json());
  configure(app);
  const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
};
const call = (url, path, user, method = "GET") => fetch(url + path, { method, headers: { "x-user": user } });

test("save, read and ai buckets are separate and counted per user", async () => {
  const app = await start(a => {
    a.get("/read", fakeAuth, readLimiter, (_q, r) => r.json({}));
    a.post("/save", fakeAuth, saveLimiter, (_q, r) => r.json({}));
    a.post("/ai", fakeAuth, aiLimiter, (_q, r) => r.json({}));
  });
  try {
    for (let i = 0; i < 120; i++) assert.equal((await call(app.url, "/save", "alice", "POST")).status, 200);
    const blocked = await call(app.url, "/save", "alice", "POST");
    assert.equal(blocked.status, 429);
    assert.match((await blocked.json()).message, /slow down/);
    assert.equal((await call(app.url, "/save", "bob", "POST")).status, 200, "another user is unaffected");
    assert.equal((await call(app.url, "/read", "alice")).status, 200, "reads do not share the save bucket");
    assert.equal((await call(app.url, "/ai", "alice", "POST")).status, 200, "ai does not share the save bucket");
    for (let i = 1; i < 20; i++) assert.equal((await call(app.url, "/ai", "alice", "POST")).status, 200);
    assert.equal((await call(app.url, "/ai", "alice", "POST")).status, 429);
    assert.equal((await call(app.url, "/ai", "bob", "POST")).status, 200);
  } finally { app.close(); }
});

test("limitByMethod counts GET as a read and writes as a save", async () => {
  const app = await start(a => {
    a.use(fakeAuth, limitByMethod);
    a.all("/x", (_q, r) => r.json({}));
  });
  try {
    for (let i = 0; i < 120; i++) assert.equal((await call(app.url, "/x", "carol", "PUT")).status, 200);
    assert.equal((await call(app.url, "/x", "carol", "PUT")).status, 429);
    assert.equal((await call(app.url, "/x", "carol", "GET")).status, 200);
  } finally { app.close(); }
});

test("the per-IP backstop counts failures only", async () => {
  const app = await start(a => {
    a.use(failedRequestLimiter);
    a.get("/ok", (_q, r) => r.json({}));
    a.get("/bad", (_q, r) => r.status(401).json({}));
  });
  try {
    for (let i = 0; i < 400; i++) assert.equal((await call(app.url, "/ok", "x")).status, 200);
    for (let i = 0; i < 300; i++) assert.equal((await call(app.url, "/bad", "x")).status, 401);
    assert.equal((await call(app.url, "/bad", "x")).status, 429);
    assert.equal((await call(app.url, "/ok", "x")).status, 429, "once over the failure budget the IP is blocked");
  } finally { app.close(); }
});

test("parseTrustProxy accepts hop counts and rejects blanket trust", () => {
  assert.equal(parseTrustProxy(undefined), false);
  assert.equal(parseTrustProxy(""), false);
  assert.equal(parseTrustProxy("false"), false);
  assert.equal(parseTrustProxy("1"), 1);
  assert.equal(parseTrustProxy(" 2 "), 2);
  assert.equal(parseTrustProxy("10.0.0.0/8, loopback"), "10.0.0.0/8, loopback");
  assert.throws(() => parseTrustProxy("true"), /spoof|X-Forwarded-For/);
});

test("behind a trusted proxy, users are keyed by their own forwarded address", async () => {
  const app = await start(a => {
    a.set("trust proxy", parseTrustProxy("1"));
    a.use(failedRequestLimiter);
    a.get("/bad", (_q, r) => r.status(401).json({}));
  });
  try {
    const hit = ip => fetch(app.url + "/bad", { headers: { "x-forwarded-for": ip } });
    for (let i = 0; i < 300; i++) await hit("203.0.113.1");
    assert.equal((await hit("203.0.113.1")).status, 429);
    assert.equal((await hit("203.0.113.2")).status, 401, "a different client behind the proxy is not blocked");
  } finally { app.close(); }
});
