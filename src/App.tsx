import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Compass,
  Leaf,
  LogOut,
  Users,
  X,
} from "lucide-react";
import type { Invites, View } from "../shared/model.ts";
import { roleLabels } from "../shared/model.ts";
import { api } from "./api.ts";
import { Field } from "./components/Fields.tsx";
import { Game } from "./components/Game.tsx";
import { Host } from "./components/Host.tsx";
import { clearDrafts, hasDrafts } from "./components/SectionEditor.tsx";

export default function App() {
  const [view, setView] = useState<View | null>(null),
    [loading, setLoading] = useState(true),
    [connected, setConnected] = useState(false),
    [error, setError] = useState(""),
    [invites, setInvites] = useState<Invites | null>(null);
  const [invitation, setInvitation] = useState(
    () => new URLSearchParams(location.hash.slice(1)).get("invite") || "",
  );
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (hasDrafts()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const hash = () => {
      const token = new URLSearchParams(location.hash.slice(1)).get("invite");
      if (token) {
        setInvitation(token);
        setView(null);
        clearDrafts();
      }
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("hashchange", hash);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("hashchange", hash);
    };
  }, []);
  useEffect(() => {
    let alive = true;
    if (invitation) {
      setLoading(false);
      return;
    }
    api<View>("/api/state")
      .then((v) => {
        if (alive) setView(v);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [invitation]);
  useEffect(() => {
    if (!view) return;
    const socket = io({ reconnection: true });
    socket.on("connect", () => setConnected(true));
    socket.on("state", (v: View) => setView(v));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (e: Error) => {
      setConnected(false);
      if (e.message === "Требуется вход") {
        setView(null);
        setError("Доступ отозван. Получите новое приглашение у ведущего.");
      }
    });
    return () => {
      socket.disconnect();
      setConnected(false);
    };
  }, [view?.session.id, view?.role, view?.teamId]);
  async function enter(token?: string, code?: string, name = "") {
    await api("/api/access", { ...(token ? { token } : { code }), name });
    history.replaceState(null, "", location.pathname);
    setInvitation("");
    setView(await api("/api/state"));
    setError("");
  }
  async function create(data: {
    hostKey: string;
    title: string;
    teamCount: number;
    durationMinutes: number;
  }) {
    const links = await api<Invites>("/api/sessions", data);
    setInvites(links);
    await enter(links.hostInvite);
  }
  async function logout() {
    await api("/api/logout", {});
    clearDrafts();
    setView(null);
    setInvites(null);
  }
  return (
    <>
      <header className="topbar">
        <a
          className="brand"
          href="/"
          aria-label="Управляй изменением — главная"
        >
          <span className="brand-icon">
            <Compass size={22} />
          </span>
          <span>
            пространство<span className="brand-sub">изменений</span>
          </span>
        </a>
        <div className="header-right">
          {view ? (
            <>
              <span className={`connection ${connected ? "online" : ""}`}>
                <i />
                {connected
                  ? "Все изменения синхронизированы"
                  : "Восстанавливаем связь"}
              </span>
              <span className="role-badge">{roleLabels[view.role]}</span>
              <button
                className="icon-button"
                onClick={() => void logout()}
                title="Выйти"
                aria-label="Выйти"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <span className="header-note">HR · Учимся действовать вместе</span>
          )}
        </div>
      </header>
      {error && (
        <div className="global-error" role="alert">
          {error}
          <button
            className="icon-button"
            onClick={() => setError("")}
            aria-label="Закрыть сообщение"
          >
            <X size={18} />
          </button>
        </div>
      )}
      {loading ? (
        <main className="loading">Открываем пространство…</main>
      ) : view ? (
        view.role === "host" ? (
          <Host
            view={view}
            update={setView}
            invites={invites}
            setError={setError}
          />
        ) : (
          <Game
            key={`${view.teamId}-${view.teams[0].round.id}`}
            view={view}
            update={setView}
            connected={connected}
            setError={setError}
          />
        )
      ) : (
        <Landing invitation={invitation} enter={enter} create={create} />
      )}
    </>
  );
}
function Landing({
  invitation,
  enter,
  create,
}: {
  invitation: string;
  enter: (token?: string, code?: string, name?: string) => Promise<void>;
  create: (data: {
    hostKey: string;
    title: string;
    teamCount: number;
    durationMinutes: number;
  }) => Promise<void>;
}) {
  const [mode, setMode] = useState<"join" | "host">("join"),
    [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [key, setKey] = useState(""),
    [title, setTitle] = useState("Управляй изменением"),
    [teamCount, setTeamCount] = useState(2),
    [minutes, setMinutes] = useState(30),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "join") await enter(invitation || undefined, code, name);
      else
        await create({
          hostKey: key,
          title,
          teamCount,
          durationMinutes: minutes,
        });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось подключиться");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="landing">
      <section className="hero">
        <div className="eyebrow">
          <span className="live-dot" /> КОМАНДНЫЙ HR-ВОРКШОП
        </div>
        <h1>
          Управляй
          <br />
          <em>изменением</em>
        </h1>
        <p className="hero-intro">
          От непростого решения —<br />к понятному плану действий.
        </p>
        <p className="hero-description">
          Обсуждайте, выбирайте и пробуйте вместе.
          <br />
          Два реальных HR-кейса и поддержка ЦЭИ на каждом шаге.
        </p>
        <div className="hero-facts">
          <span>
            <b>30</b> минут на кейс
          </span>
          <span>
            <b>2–3</b> команды
          </span>
          <span>
            <b>20</b> участников
          </span>
        </div>
        <div className="hero-bottom">
          <Leaf size={18} /> Без баллов и соревнования. С пользой для команды.
        </div>
      </section>
      <section className="entry-side">
        <div className="decor-orbit orbit-one" />
        <div className="decor-orbit orbit-two" />
        <div className="entry-card">
          <span className="step-tag">
            <Users size={16} /> ВАШЕ МЕСТО В КОМАНДЕ
          </span>
          <h2>
            {mode === "host"
              ? "Начнём воркшоп"
              : invitation
                ? "Вы приглашены"
                : "Присоединяйтесь"}
          </h2>
          <p className="muted">
            {mode === "host"
              ? "Создайте общее пространство для команд."
              : "Команда обсуждает решения в Teams и собирает здесь общий план."}
          </p>
          <form onSubmit={(e) => void submit(e)}>
            {mode === "join" ? (
              <>
                <Field
                  label="Как к вам обращаться"
                  value={name}
                  onChange={setName}
                  placeholder="Имя — по желанию"
                />
                {!invitation && (
                  <Field
                    label="Код команды"
                    value={code}
                    onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6 цифр от ведущего"
                  />
                )}
                <button
                  className="button primary wide"
                  disabled={busy || (!invitation && code.length !== 6)}
                >
                  {busy ? "Подключаемся…" : "Подключиться"}
                  <ArrowRight size={18} />
                </button>
              </>
            ) : (
              <>
                <Field
                  label="Ключ ведущего"
                  type="password"
                  value={key}
                  onChange={setKey}
                />
                <Field
                  label="Название воркшопа"
                  value={title}
                  onChange={setTitle}
                />
                <div className="field-grid">
                  <label className="field">
                    <span>Количество команд</span>
                    <select
                      value={teamCount}
                      onChange={(e) => setTeamCount(+e.target.value)}
                    >
                      <option value={2}>2 команды</option>
                      <option value={3}>3 команды</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Минут на кейс</span>
                    <input
                      type="number"
                      value={minutes}
                      min={5}
                      max={120}
                      onChange={(e) => setMinutes(+e.target.value)}
                    />
                  </label>
                </div>
                <button
                  className="button primary wide"
                  disabled={busy || !key || !title.trim()}
                >
                  {busy ? "Создаём…" : "Создать сессию"}
                  <ArrowRight size={18} />
                </button>
                <p className="fine">
                  Ключ ведущего выдаётся при запуске приложения. Инструкция — в
                  руководстве организатора.
                </p>
              </>
            )}
            {error && (
              <p role="alert" className="notice warning">
                {error}
              </p>
            )}
          </form>
          <div className="entry-footer">
            <Check size={15} />
            {mode === "join"
              ? "Регистрация не требуется"
              : "Таймеры, кейсы и результаты в одном месте"}
            <button
              className="text-button"
              onClick={() => {
                setMode(mode === "join" ? "host" : "join");
                setError("");
              }}
            >
              {mode === "join" ? "Я ведущий" : "Я участник"}
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
        <div className="preview-card">
          <span className="preview-icon">↗</span>
          <div>
            <b>Один план. Много точек зрения.</b>
            <p>Каждое предложение помогает увидеть больше.</p>
          </div>
        </div>
      </section>
      <footer className="landing-footer">
        Корпоративный фреймворк внедрения изменений{" "}
        <span>Подготовка → Старт → Основная часть → Завершение</span>
      </footer>
    </main>
  );
}
