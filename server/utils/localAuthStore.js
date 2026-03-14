import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.resolve(__dirname, "..", ".local-users.json");

async function readStore() {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

async function writeStore(users) {
  await fs.writeFile(STORE_PATH, JSON.stringify(users, null, 2), "utf8");
}

export async function findLocalUserByEmail(email) {
  const users = await readStore();
  return users.find((u) => u.email === email) || null;
}

export async function findLocalUserById(id) {
  const users = await readStore();
  return users.find((u) => u.id === id) || null;
}

export async function createLocalUser({ email, passwordHash }) {
  const users = await readStore();
  const user = { id: randomUUID(), email, passwordHash, createdAt: new Date().toISOString() };
  users.push(user);
  await writeStore(users);
  return user;
}
