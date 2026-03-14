import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.resolve(__dirname, "..", ".local-analyses.json");

async function readStore() {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

async function writeStore(items) {
  await fs.writeFile(STORE_PATH, JSON.stringify(items, null, 2), "utf8");
}

export async function saveLocalAnalysis(userId, payload) {
  const items = await readStore();
  const doc = {
    _id: randomUUID(),
    userId: String(userId),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...payload
  };
  items.push(doc);
  await writeStore(items);
  return doc;
}

export async function getLatestLocalAnalysis(userId) {
  const items = await readStore();
  const filtered = items.filter((x) => String(x.userId) === String(userId));
  if (!filtered.length) return null;
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return filtered[0];
}

