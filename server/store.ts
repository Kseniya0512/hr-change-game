import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Access, Session } from "../shared/model.ts";
export const token = () => randomBytes(32).toString("base64url");
const hash = (v: string) => createHash("sha256").update(v).digest("hex");
export class Store {
  readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS invites(hash TEXT PRIMARY KEY,access TEXT NOT NULL,revoked INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS credentials(hash TEXT PRIMARY KEY,invite_hash TEXT NOT NULL,access TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS commands(key TEXT PRIMARY KEY);
 `);
  }
  save(s: Session) {
    this.db
      .prepare(
        "INSERT INTO sessions VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      )
      .run(s.id, JSON.stringify(s));
  }
  get(id: string): Session | undefined {
    const row = this.db
      .prepare("SELECT data FROM sessions WHERE id=?")
      .get(id) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : undefined;
  }
  all(): Session[] {
    return (
      this.db.prepare("SELECT data FROM sessions").all() as unknown as {
        data: string;
      }[]
    ).map((r) => JSON.parse(r.data));
  }
  invite(access: Access) {
    const value = token();
    this.db
      .prepare("INSERT INTO invites(hash,access) VALUES(?,?)")
      .run(hash(value), JSON.stringify(access));
    return value;
  }
  credential(invitation: string, name: string) {
    const h = hash(invitation);
    const row = this.db
      .prepare("SELECT access FROM invites WHERE hash=? AND revoked=0")
      .get(h) as { access: string } | undefined;
    if (!row) return null;
    const access: Access = {
      ...JSON.parse(row.access),
      name: name || JSON.parse(row.access).name,
    };
    const value = token();
    this.db
      .prepare("INSERT INTO credentials VALUES(?,?,?)")
      .run(hash(value), h, JSON.stringify(access));
    return { value, access };
  }
  codeCredential(code: string, name: string) {
    for (const s of this.all()) {
      const t = s.teams.find((t) => t.code === code);
      if (t) {
        const invite = this.invite({
          role: "participant",
          sessionId: s.id,
          teamId: t.id,
          name,
        });
        return this.credential(invite, name);
      }
    }
    return null;
  }
  authenticate(cookie: string | undefined): Access | undefined {
    if (!cookie) return;
    const row = this.db
      .prepare(
        "SELECT c.access FROM credentials c JOIN invites i ON c.invite_hash=i.hash WHERE c.hash=? AND i.revoked=0",
      )
      .get(hash(cookie)) as { access: string } | undefined;
    return row ? JSON.parse(row.access) : undefined;
  }
  revoke(sessionId: string, teamId: string, role: string) {
    for (const row of this.db
      .prepare("SELECT hash,access FROM invites WHERE revoked=0")
      .all() as unknown as { hash: string; access: string }[]) {
      const a: Access = JSON.parse(row.access);
      if (a.sessionId === sessionId && a.teamId === teamId && a.role === role)
        this.db
          .prepare("UPDATE invites SET revoked=1 WHERE hash=?")
          .run(row.hash);
    }
  }
  logout(value: string | undefined) {
    if (value)
      this.db.prepare("DELETE FROM credentials WHERE hash=?").run(hash(value));
  }
  seen(key: string) {
    return !!this.db
      .prepare("SELECT key FROM commands WHERE key=?")
      .get(hash(key));
  }
  commit(s: Session, key?: string) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.save(s);
      if (key) this.db.prepare("INSERT INTO commands VALUES(?)").run(hash(key));
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  close() {
    this.db.close();
  }
}
