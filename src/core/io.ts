// Validated reads/writes + small shared helpers (hashing, text masking, time).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { z } from "zod";

export function ensureDir(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Read + validate. Throws with the file path and the zod issues on mismatch. */
export function load<T>(schema: z.ZodType<T>, file: string): T {
  if (!fs.existsSync(file)) throw new Error(`Missing artifact: ${file}`);
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const r = schema.safeParse(raw);
  if (!r.success) throw new Error(`Invalid artifact ${file}:\n${r.error.issues.slice(0, 8).map(i => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
  return r.data;
}

/** Validate + atomic write (tmp file + rename), so a crash never leaves a half-written artifact. */
export function save<T>(schema: z.ZodType<T>, file: string, data: T): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error(`Refusing to write invalid artifact ${file}:\n${r.error.issues.slice(0, 8).map(i => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
  writeText(file, JSON.stringify(r.data, null, 2));
  return r.data;
}

export function writeText(file: string, text: string | Buffer): void {
  ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

export function readJson<T = unknown>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

export function sha256(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function fileSha(file: string): string {
  return sha256(fs.readFileSync(file));
}

/** Canonical JSON: sorted keys, so hashes are stable across runs and machines. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).filter(k => o[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${canonical(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

/** Lowercase, digits -> '#', whitespace collapsed, cut to n chars. Used for identity keys. */
export function mask(s: string | undefined, n = 40): string {
  return (s ?? "").toLowerCase().replace(/\d+([.,]\d+)?/g, "#").replace(/\s+/g, " ").trim().slice(0, n);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function runId(prefix = "r"): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${prefix}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function rel(from: string, to: string): string {
  return path.relative(from, to).split(path.sep).join("/");
}

/** Parse the first number in a string ("1,250 credits" -> 1250, "x3" -> 3). */
export function parseNumber(s: string | undefined): number | null {
  if (!s) return null;
  const m = /(-?\d{1,3}(?:[,.\s]\d{3})+|-?\d+(?:\.\d+)?)/.exec(s);
  if (!m) return null;
  const n = Number(m[1].replace(/[,\s]/g, "").replace(/\.(?=\d{3}\b)/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
