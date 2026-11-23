const { test } = require("node:test");
const assert = require("node:assert/strict");
// firebaseConfig initializes the Admin SDK on import; dummy values are enough because verification is mocked.
process.env.FIREBASE_PROJECT_ID ||= "test";
process.env.FIREBASE_CLIENT_EMAIL ||= "test@test.iam.gserviceaccount.com";
process.env.FIREBASE_PRIVATE_KEY ||= require("node:crypto").generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" });
const Document = require("../dist/Models/documentModel").default;
const userService = require("../dist/Services/userService");
const { registerSocket } = require("../dist/socket");

const setup = () => {
  let middleware, onConnection;
  registerSocket({ use: fn => { middleware = fn; }, on: (name, fn) => { if (name === "connection") onConnection = fn; } });
  const connect = async token => {
    const emitted = [];
    const relayed = [];
    const handlers = {};
    const socket = {
      handshake: { auth: token === undefined ? {} : { token } },
      data: {},
      rooms: new Set(),
      join: room => socket.rooms.add(room),
      emit: (...args) => emitted.push(args),
      to: room => ({ emit: (...args) => relayed.push([room, ...args]) }),
      on: (name, fn) => { handlers[name] = fn; },
    };
    const error = await new Promise(resolve => middleware(socket, resolve));
    if (!error) onConnection(socket);
    return { socket, error, handlers, emitted, relayed };
  };
  return connect;
};

test("sockets without a valid Firebase token are refused", async t => {
  const connect = setup();
  const verify = t.mock.method(userService, "verifyFirebaseTokenAndEnsureUser", async token => {
    if (token !== "good") throw new Error("bad token");
    return { user: { _id: "owner", email: "owner@example.com" } };
  });
  assert.match((await connect()).error.message, /Authentication required/);
  assert.match((await connect("")).error.message, /Authentication required/);
  assert.match((await connect({ not: "a string" })).error.message, /Authentication required/);
  assert.equal(verify.mock.callCount(), 0);
  assert.match((await connect("forged")).error.message, /Authentication failed/);
  const ok = await connect("good");
  assert.equal(ok.error, undefined);
  assert.equal(ok.socket.data.userId, "owner");
});

test("a socket joins a document room only with document access, and cannot relay into other rooms", async t => {
  const connect = setup();
  t.mock.method(userService, "verifyFirebaseTokenAndEnsureUser", async token => ({ user: { _id: token, email: `${token}@example.com` } }));
  t.mock.method(Document, "findById", async id => {
    if (id === "bad-id") throw new Error("Cast to ObjectId failed");
    return id === "doc" ? { user_id: "owner", users: ["member"], kind: "document" } : null;
  });

  const stranger = await connect("stranger");
  await stranger.handlers.enter("owner@example.com", "doc");
  assert.equal(stranger.socket.rooms.has("doc"), false);
  assert.deepEqual(stranger.emitted, [["enter-denied", "doc"]]);
  stranger.handlers["text-changes"]({ content: "injected" }, "doc");
  assert.deepEqual(stranger.relayed, []);

  for (const code of ["missing", "bad-id", undefined, { $ne: null }]) await stranger.handlers.enter("x", code);
  assert.equal(stranger.socket.rooms.size, 0);

  const owner = await connect("owner");
  await owner.handlers.enter("spoofed@example.com", "doc");
  assert.equal(owner.socket.rooms.has("doc"), true);
  assert.deepEqual(owner.relayed, [["doc", "enter", "owner@example.com", "doc"]]);
  owner.handlers["text-changes"]({ content: "hello" }, "doc");
  owner.handlers["text-changes"]({ content: "elsewhere" }, "other-doc");
  assert.deepEqual(owner.relayed.slice(1), [["doc", "text-changes", { content: "hello" }]]);

  const member = await connect("member");
  await member.handlers.enter("member@example.com", "doc");
  assert.equal(member.socket.rooms.has("doc"), true);
  assert.equal(owner.handlers.test, undefined);
});
