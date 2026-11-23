const { test } = require("node:test");
const assert = require("node:assert/strict");
// firebaseConfig initializes the Admin SDK on import; dummy values are enough because verification is mocked.
process.env.FIREBASE_PROJECT_ID ||= "test";
process.env.FIREBASE_CLIENT_EMAIL ||= "test@test.iam.gserviceaccount.com";
process.env.FIREBASE_PRIVATE_KEY ||= require("node:crypto").generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" });
const Document = require("../dist/Models/documentModel").default;
const userService = require("../dist/Services/userService");
const { registerSocket } = require("../dist/socket");
const { documentAccessChanged } = require("../dist/utils/documentAccessEvents");

const setup = () => {
  let middleware, onConnection;
  const connected = [];
  // `in(room).fetchSockets()` mirrors socket.io: it returns the sockets currently in the room.
  registerSocket({
    use: fn => { middleware = fn; },
    on: (name, fn) => { if (name === "connection") onConnection = fn; },
    in: room => ({ fetchSockets: async () => connected.filter(socket => socket.rooms.has(room)) }),
  });
  const connect = async token => {
    const emitted = [];
    const relayed = [];
    const handlers = {};
    const socket = {
      handshake: { auth: token === undefined ? {} : { token } },
      data: {},
      rooms: new Set(),
      join: room => socket.rooms.add(room),
      leave: room => socket.rooms.delete(room),
      emit: (...args) => emitted.push(args),
      to: room => ({ emit: (...args) => relayed.push([room, ...args]) }),
      on: (name, fn) => { handlers[name] = fn; },
    };
    const error = await new Promise(resolve => middleware(socket, resolve));
    if (!error) { onConnection(socket); connected.push(socket); }
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

test("viewers and commenters join the room and receive changes but cannot relay their own", async t => {
  const connect = setup();
  t.mock.method(userService, "verifyFirebaseTokenAndEnsureUser", async token => ({ user: { _id: token, email: `${token}@example.com` } }));
  t.mock.method(Document, "findById", async () => ({ user_id: "owner", users: ["editor"], commenters: ["commenter"], viewers: ["viewer"], kind: "document" }));
  const sent = {};
  for (const who of ["owner", "editor", "commenter", "viewer"]) {
    const client = await connect(who);
    await client.handlers.enter("x", "doc");
    assert.equal(client.socket.rooms.has("doc"), true, `${who} joins`);
    client.handlers["text-changes"]({ content: who }, "doc");
    sent[who] = client.relayed.filter(entry => entry[1] === "text-changes").length;
  }
  assert.deepEqual(sent, { owner: 1, editor: 1, commenter: 0, viewer: 0 });
});

test("a socket loses the room, or the right to relay, as soon as its access changes", async t => {
  const connect = setup();
  t.mock.method(userService, "verifyFirebaseTokenAndEnsureUser", async token => ({ user: { _id: token, email: `${token}@example.com` } }));
  const doc = { user_id: "owner", users: ["member"], commenters: [], viewers: [], kind: "document" };
  t.mock.method(Document, "findById", async () => doc);
  const member = await connect("member");
  await member.handlers.enter("x", "doc");
  member.handlers["text-changes"]({ content: "1" }, "doc");
  assert.equal(member.relayed.filter(entry => entry[1] === "text-changes").length, 1);

  // Downgraded to viewer: still in the room, but can no longer push edits.
  Object.assign(doc, { users: [], viewers: ["member"] });
  documentAccessChanged("doc");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(member.socket.rooms.has("doc"), true);
  member.handlers["text-changes"]({ content: "2" }, "doc");
  assert.equal(member.relayed.filter(entry => entry[1] === "text-changes").length, 1);

  // Removed entirely: kicked from the room and told so.
  Object.assign(doc, { viewers: [] });
  documentAccessChanged("doc");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(member.socket.rooms.has("doc"), false);
  assert.deepEqual(member.emitted.at(-1), ["enter-denied", "doc"]);
  member.handlers["text-changes"]({ content: "3" }, "doc");
  assert.equal(member.relayed.filter(entry => entry[1] === "text-changes").length, 1);
});
