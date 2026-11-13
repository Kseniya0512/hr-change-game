import { useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  FilePenLine,
  Flag,
  Link,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import type {
  CaseId,
  Invites,
  View,
  WorkshopContent,
} from "../../shared/model.ts";
import { stepTitles } from "../../shared/model.ts";
import { completion } from "../../shared/plan.ts";
import { api } from "../api.ts";
import { Field, Select } from "./Fields.tsx";
import { RiskLinks } from "./RiskLinks.tsx";
import { Game, Timer } from "./Game.tsx";

export function Host({
  view,
  update,
  invites,
  setError,
}: {
  view: View;
  update: (v: View) => void;
  invites: Invites | null;
  setError: (e: string) => void;
}) {
  const [selected, setSelected] = useState(""),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(""),
    [newLinks, setNewLinks] = useState<Record<string, string>>({});
  const session = view.session;
  async function control(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      const result = await api<{ state: View; invite?: string }>(
        `/api/sessions/${session.id}/control`,
        { action, ...extra },
      );
      update(result.state);
      if (result.invite)
        setNewLinks((v) => ({
          ...v,
          [`${extra.teamId}-${action}`]: result.invite!,
        }));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось выполнить действие",
      );
    } finally {
      setBusy(false);
    }
  }
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(""), 3000);
    } catch {
      setError(
        "Не удалось скопировать. Откройте ссылку и скопируйте адрес вручную.",
      );
    }
  }
  const inviteUrl = (token: string) => `${location.origin}/#invite=${token}`;
  if (selected) {
    const team = view.teams.find((t) => t.id === selected);
    if (team)
      return (
        <Game
          key={team.round.id}
          view={{ ...view, teamId: selected, teams: [team] }}
          update={update}
          connected={true}
          setError={setError}
          onBack={() => setSelected("")}
        />
      );
  }
  return (
    <main className="host-page">
      <div className="host-heading">
        <div>
          <span className="eyebrow">{session.title}</span>
          <h1>Пульт ведущего</h1>
          <p>
            Держите общий ритм. Помогайте командам двигаться к своему плану.
          </p>
        </div>
        <button className="button soft" onClick={() => setEditing(!editing)}>
          <FilePenLine size={18} />
          {editing ? "К командам" : "Материалы и подсказки"}
        </button>
      </div>
      {editing ? (
        <ContentEditor
          content={session.content}
          disabled={view.teams.some((t) =>
            ["running", "paused"].includes(t.round.status),
          )}
          save={async (content) => {
            update(await api("/api/content", { content }, "PUT"));
            setEditing(false);
          }}
        />
      ) : (
        <>
          <div className="host-overview">
            <div>
              <Users size={20} />
              <b>{view.teams.length}</b>
              <span>команды в сессии</span>
            </div>
            <div>
              <Play size={20} />
              <b>
                {view.teams.filter((t) => t.round.status === "running").length}
              </b>
              <span>раундов идут сейчас</span>
            </div>
            <div>
              <Flag size={20} />
              <b>{session.durationMinutes}</b>
              <span>минут на один кейс</span>
            </div>
          </div>
          <section className="host-toolbar">
            <div>
              <span className="eyebrow">ОБЩИЙ РИТМ</span>
              <p>Управляйте всеми командами или каждой отдельно.</p>
            </div>
            <div className="toolbar-buttons">
              <button
                className="button primary small"
                disabled={busy}
                onClick={() => void control("start")}
              >
                <Play size={16} />
                Начать всем
              </button>
              <button
                className="button small"
                disabled={busy}
                onClick={() => void control("pause")}
              >
                <Pause size={16} />
                Пауза всем
              </button>
              <button
                className="button small"
                disabled={busy}
                onClick={() => void control("resume")}
              >
                <Play size={16} />
                Продолжить всем
              </button>
              <button
                className="button small"
                disabled={busy}
                onClick={() => void control("extend", { minutes: 5 })}
              >
                <Plus size={16} />5 минут всем
              </button>
              <button
                className="button small"
                disabled={busy}
                onClick={() => void control("finish")}
              >
                <Flag size={16} />
                Завершить всем
              </button>
            </div>
          </section>
          <div className="team-grid">
            {view.teams.map((t, i) => {
              const p = completion(t.round.plan);
              return (
                <article className={`team-card team-color-${i}`} key={t.id}>
                  <div className="section-heading">
                    <span className="team-mark">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={`status-label ${t.round.status}`}>
                      {
                        {
                          waiting: "Ожидает старта",
                          running: "Идёт обсуждение",
                          paused: "Пауза",
                          finished: "Раунд завершён",
                        }[t.round.status]
                      }
                    </span>
                  </div>
                  <h2>{t.name}</h2>
                  <p className="team-case">{t.round.caseData.title}</p>
                  <div className="team-time">
                    <Timer round={t.round} serverNow={view.serverNow} />
                    <span>
                      Код <b>{t.code}</b>
                    </span>
                  </div>
                  <div className="progress-track">
                    <div style={{ width: `${(p.done / p.total) * 100}%` }} />
                  </div>
                  <div className="team-progress">
                    <b>
                      {p.done} из {p.total} заполнено
                    </b>
                    <span>Шаг {t.round.step + 1} из 6</span>
                  </div>
                  <p className="fine">{stepTitles[t.round.step]}</p>
                  <div className="team-signals">
                    <span>
                      <Sparkles size={14} />
                      {t.round.event ? "Событие открыто" : "Событие впереди"}
                    </span>
                    <span>{t.round.helpLog.length} обращений к помощи</span>
                  </div>
                  <button
                    className="button primary wide"
                    onClick={() => setSelected(t.id)}
                  >
                    Посмотреть план
                    <ArrowRight size={17} />
                  </button>
                  <div className="team-controls">
                    {t.round.status === "waiting" && (
                      <>
                        <Select
                          label="Кейс команды"
                          value={t.round.caseId}
                          options={[
                            { value: "bonus", label: "Премирование" },
                            { value: "medical", label: "Медицинские льготы" },
                          ]}
                          disabled={busy}
                          onChange={(caseId) =>
                            void control("assign", { teamId: t.id, caseId })
                          }
                        />
                        <button
                          className="button small"
                          disabled={busy}
                          onClick={() =>
                            void control("start", { teamId: t.id })
                          }
                        >
                          <Play size={15} />
                          Начать
                        </button>
                      </>
                    )}
                    {t.round.status === "running" && (
                      <>
                        <button
                          className="button small"
                          disabled={busy}
                          onClick={() =>
                            void control("pause", { teamId: t.id })
                          }
                        >
                          <Pause size={15} />
                          Пауза
                        </button>
                        <button
                          className="button small"
                          disabled={busy || !!t.round.event}
                          onClick={() =>
                            void control("event", { teamId: t.id })
                          }
                        >
                          <Sparkles size={15} />
                          Открыть событие
                        </button>
                      </>
                    )}
                    {t.round.status === "paused" && (
                      <button
                        className="button small"
                        disabled={busy}
                        onClick={() => void control("resume", { teamId: t.id })}
                      >
                        <Play size={15} />
                        Продолжить
                      </button>
                    )}
                    {t.round.status === "finished" && (
                      <button
                        className="button small"
                        disabled={busy}
                        onClick={() =>
                          void control("newRound", { teamId: t.id })
                        }
                      >
                        <RefreshCw size={15} />
                        Следующий кейс
                      </button>
                    )}
                    {t.round.status !== "waiting" && (
                      <>
                        <button
                          className="button small"
                          disabled={busy}
                          onClick={() =>
                            void control("extend", { teamId: t.id, minutes: 5 })
                          }
                        >
                          <Plus size={15} />5 минут
                        </button>
                        {t.round.status !== "finished" && (
                          <button
                            className="button small"
                            disabled={busy}
                            onClick={() =>
                              void control("finish", { teamId: t.id })
                            }
                          >
                            Завершить
                          </button>
                        )}
                      </>
                    )}
                    <a
                      className="button small"
                      href={`/api/teams/${t.id}/export.pdf`}
                    >
                      <Download size={15} />
                      PDF
                    </a>
                  </div>
                  <details className="team-detail">
                    <summary>Вопросы, помощь и предыдущие раунды</summary>
                    <p className="fine">
                      Нужно заполнить:{" "}
                      {p.missing.join(", ") ||
                        "Все основные элементы заполнены"}
                      .
                    </p>
                    <p>
                      {t.round.plan.ceiQuestions ||
                        "Вопросы для ЦЭИ пока не записаны."}
                    </p>
                    {t.round.helpLog.length > 0 && (
                      <ul className="fine">
                        {Array.from(
                          new Set(t.round.helpLog.map((h) => h.step)),
                        ).map((step) => (
                          <li key={step}>
                            {stepTitles[step]} —{" "}
                            {
                              t.round.helpLog.filter((h) => h.step === step)
                                .length
                            }{" "}
                            открытий помощи
                          </li>
                        ))}
                      </ul>
                    )}
                    {t.history.map((r, n) => (
                      <a
                        key={r.id}
                        className="history-link"
                        href={`/api/teams/${t.id}/export.pdf?roundId=${r.id}`}
                      >
                        <Download size={14} />
                        Раунд {n + 1}: {r.caseData.title}
                      </a>
                    ))}
                  </details>
                </article>
              );
            })}
          </div>
          <section className="invite-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">СОБЕРИТЕ КОМАНДЫ</span>
                <h2>Ссылки для подключения</h2>
              </div>
              <Link size={24} />
            </div>
            <p className="muted">
              Участникам достаточно кода команды. Ссылки капитана и куратора
              дают расширенные права — передайте их только назначенным людям.
            </p>
            {invites && (
              <div className="host-invite">
                <b>Ваш доступ ведущего</b>
                <button
                  className="button small"
                  onClick={() =>
                    void copy(inviteUrl(invites.hostInvite), "host")
                  }
                >
                  <Copy size={14} />
                  {copied === "host"
                    ? "Скопировано"
                    : "Скопировать ссылку ведущего"}
                </button>
                <a className="text-button" href={inviteUrl(invites.hostInvite)}>
                  Открыть ссылку
                </a>
              </div>
            )}
            {view.teams.map((t) => {
              const original = invites?.teams.find((x) => x.id === t.id);
              return (
                <div className="invite-row" key={t.id}>
                  <div>
                    <b>{t.name}</b>
                    <span className="team-code">{t.code}</span>
                  </div>
                  <button
                    className="button small"
                    onClick={() => void copy(t.code, `${t.id}-code`)}
                  >
                    <Copy size={14} />
                    {copied === `${t.id}-code`
                      ? "Скопировано"
                      : "Код участникам"}
                  </button>
                  {(["Captain", "Curator"] as const).map((role) => {
                    const name = role === "Captain" ? "капитана" : "куратора",
                      token =
                        newLinks[`${t.id}-rotate${role}`] ||
                        (role === "Captain"
                          ? original?.captainInvite
                          : original?.curatorInvite);
                    return (
                      <div className="invite-role" key={role}>
                        {token ? (
                          <>
                            <button
                              className="button small"
                              onClick={() =>
                                void copy(inviteUrl(token), `${t.id}-${role}`)
                              }
                            >
                              <Copy size={14} />
                              {copied === `${t.id}-${role}`
                                ? "Скопировано"
                                : `Ссылка ${name}`}
                            </button>
                            <a
                              className="text-button fine"
                              href={inviteUrl(token)}
                            >
                              Открыть
                            </a>
                          </>
                        ) : null}
                        <button
                          className="text-button fine"
                          disabled={busy}
                          onClick={() =>
                            void control(`rotate${role}`, { teamId: t.id })
                          }
                        >
                          Новая ссылка {name}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <p className="fine">
              Новая ссылка капитана или куратора отзывает прежний доступ этой
              роли в команде.
            </p>
          </section>
        </>
      )}
      <footer className="host-footer">
        <Check size={16} />
        Планы сохраняются на сервере. Завершение раунда сохраняет результат для
        обсуждения.
      </footer>
    </main>
  );
}

function ContentEditor({
  content,
  disabled,
  save,
}: {
  content: WorkshopContent;
  disabled: boolean;
  save: (c: WorkshopContent) => Promise<void>;
}) {
  const [draft, setDraft] = useState(() => structuredClone(content)),
    [caseId, setCaseId] = useState<CaseId>("bonus"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const c = draft.cases[caseId];
  const setCase = (value: Partial<typeof c>) =>
    setDraft({
      ...draft,
      cases: { ...draft.cases, [caseId]: { ...c, ...value } },
    });
  return (
    <section className="content-editor">
      <h2>Материалы воркшопа</h2>
      <p className="muted">
        Редактируйте формулировки между раундами. Предыдущие результаты
        сохраняют свою версию материалов. Порог применимости остаётся 2+.
      </p>
      {disabled && (
        <p className="notice warning">
          Сначала завершите активные и приостановленные раунды.
        </p>
      )}
      <fieldset disabled={disabled || busy}>
        <Select
          label="Редактируемый кейс"
          value={caseId}
          options={[
            { value: "bonus", label: "Премирование" },
            { value: "medical", label: "Медицинские льготы" },
          ]}
          onChange={(v) => setCaseId(v as CaseId)}
        />
        <Field
          label="Название кейса"
          value={c.title}
          onChange={(title) => setCase({ title })}
        />
        {(["before", "after", "why", "notice"] as const).map((key, i) => (
          <Field
            key={key}
            label={["Было", "Стало", "Почему меняем", "Важные условия"][i]}
            value={c[key]}
            multiline
            onChange={(v) => setCase({ [key]: v })}
          />
        ))}
        <Field
          label="Группы сотрудников — по одной в строке"
          value={c.groups.join("\n")}
          multiline
          onChange={(v) => setCase({ groups: v.split("\n") })}
        />
        <Field
          label="Направления цели — по одному в строке"
          value={c.goals.join("\n")}
          multiline
          onChange={(v) => setCase({ goals: v.split("\n") })}
        />
        <Field
          label="Предлагаемые действия — по одному в строке"
          value={c.actions.join("\n")}
          multiline
          onChange={(v) => setCase({ actions: v.split("\n") })}
        />
        <details>
          <summary>Карточки рисков</summary>
          {c.risks.map((r, i) => (
            <div className="edit-card" key={r.id}>
              <h4>Риск {i + 1}</h4>
              {(
                [
                  "title",
                  "cause",
                  "consequence",
                  "prevention",
                  "response",
                ] as const
              ).map((key, n) => (
                <Field
                  key={key}
                  label={
                    [
                      "Название",
                      "Причина",
                      "Последствие",
                      "Предупреждение",
                      "Реакция",
                    ][n]
                  }
                  value={r[key]}
                  multiline
                  onChange={(v) =>
                    setCase({
                      risks: c.risks.map((x, index) =>
                        index === i ? { ...x, [key]: v } : x,
                      ),
                    })
                  }
                />
              ))}
            </div>
          ))}
        </details>
        <details>
          <summary>Метрики</summary>
          {c.metrics.map((m, i) => (
            <div className="edit-card" key={i}>
              {(["title", "measure", "source", "owner", "when"] as const).map(
                (key, n) => (
                  <Field
                    key={key}
                    label={
                      [
                        "Показатель",
                        "Что измеряем",
                        "Источник",
                        "Владелец",
                        "Когда",
                      ][n]
                    }
                    value={m[key]}
                    onChange={(v) =>
                      setCase({
                        metrics: c.metrics.map((x, index) =>
                          index === i ? { ...x, [key]: v } : x,
                        ),
                      })
                    }
                  />
                ),
              )}
            </div>
          ))}
        </details>
        <details>
          <summary>Неожиданные события</summary>
          {c.events.map((e, i) => (
            <div className="edit-card" key={e.id}>
              {(["title", "text", "prompt"] as const).map((key, n) => (
                <Field
                  key={key}
                  label={
                    [
                      "Название события",
                      "Описание",
                      "Направление для обсуждения",
                    ][n]
                  }
                  value={e[key]}
                  multiline
                  onChange={(v) =>
                    setCase({
                      events: c.events.map((x, index) =>
                        index === i ? { ...x, [key]: v } : x,
                      ),
                    })
                  }
                />
              ))}
              <RiskLinks
                risks={c.risks}
                value={e.riskIds}
                onChange={(riskIds) => setCase({
                  events: c.events.map((x, index) => index === i ? { ...x, riskIds } : x),
                })}
              />
            </div>
          ))}
        </details>
        <details>
          <summary>Роли и критерии</summary>
          <Field
            label="Доступные роли — по одной в строке"
            value={draft.roles.join("\n")}
            multiline
            onChange={(v) => setDraft({ ...draft, roles: v.split("\n") })}
          />
          {draft.criteria.map((criterion, i) => (
            <Field
              key={i}
              label={`Критерий ${i + 1}`}
              value={criterion}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  criteria: draft.criteria.map((x, n) => (n === i ? v : x)),
                })
              }
            />
          ))}
        </details>
        <details>
          <summary>Помощь на шести экранах</summary>
          {draft.hints.map((h, i) => (
            <div className="edit-card" key={i}>
              <h4>
                {i + 1}. {stepTitles[i]}
              </h4>
              {(["hint", "cei", "missed", "source"] as const).map((key, n) => (
                <Field
                  key={key}
                  label={
                    [
                      "Подсказка",
                      "Объяснение ЦЭИ",
                      "Что могли упустить",
                      "Источник правила",
                    ][n]
                  }
                  value={h[key]}
                  multiline
                  onChange={(v) =>
                    setDraft({
                      ...draft,
                      hints: draft.hints.map((x, index) =>
                        index === i ? { ...x, [key]: v } : x,
                      ),
                    })
                  }
                />
              ))}
            </div>
          ))}
        </details>
      </fieldset>
      {error && (
        <p role="alert" className="notice warning">
          {error}
        </p>
      )}
      <button
        className="button primary"
        disabled={disabled || busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await save(draft);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Не удалось сохранить");
          } finally {
            setBusy(false);
          }
        }}
      >
        Сохранить материалы
      </button>
    </section>
  );
}
