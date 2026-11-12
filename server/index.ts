import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createApp } from "./app.ts";
import { token } from "./store.ts";
const dir = resolve(process.env.DATA_DIR || ".data");
mkdirSync(dir, { recursive: true });
const keyPath = resolve(dir, "host-key");
if (!process.env.HOST_ACCESS_KEY && !existsSync(keyPath))
  writeFileSync(keyPath, token(), { mode: 0o600 });
const hostKey =
  process.env.HOST_ACCESS_KEY || readFileSync(keyPath, "utf8").trim();
if (hostKey.length < 24)
  throw new Error("HOST_ACCESS_KEY должен содержать минимум 24 символа");
const app = createApp({ dbPath: resolve(dir, "workshop.sqlite"), hostKey });
await app.listen(Number(process.env.PORT || 3000));
console.log(
  `Workshop server ready on port ${process.env.PORT || 3000}. Host access: ${process.env.HOST_ACCESS_KEY ? "configured environment variable" : keyPath}`,
);
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
