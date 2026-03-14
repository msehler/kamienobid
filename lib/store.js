const fs = require("fs");
const path = require("path");

const { createSeedState } = require("./app-data");

const STORE_PATH = process.env.KAMIENO_STORE_PATH
  || (process.env.VERCEL
    ? path.join("/tmp", "kamienobid-store.json")
    : path.join(process.cwd(), "data", "store.json"));

function ensureStore() {
  const directory = path.dirname(STORE_PATH);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(createSeedState(), null, 2));
  }
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  return store;
}

module.exports = {
  STORE_PATH,
  readStore,
  writeStore,
};
