import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Lightbulb,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import type { PlanSection, View } from "../../shared/model.ts";
import { stepTitles } from "../../shared/model.ts";
import { completion, remaining, timerText } from "../../shared/plan.ts";
import { api, ApiError, uid } from "../api.ts";
import { Field } from "./Fields.tsx";
import { GameScreens } from "./GameScreens.tsx";

export function Timer({
  round,
  serverNow,
}: {
  round: View["teams"][number]["round"];
  serverNow: number;
}) {
  const [now, setNow] = useState(Date.now());
  const offset = useMemo(() => serverNow - Date.now(), [serverNow]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = remaining(round, now + offset);
  return (
    <span className={`timer ${ms < 7 * 60000 ? "urgent" : ""}`}>
      <Clock3 size={18} />
      {timerText(ms)}
      {round.status === "paused" && <small>пауза</small>}
      {round.status === "waiting" && <small>до старта</small>}
    </span>
  );
}
const sectionsByStep: PlanSection[] = [
  "initiative",
  "assessment",
  "stakeholders",
  "actions",
  "eventResponse",
  "ceiQuestions",
];
export function Game({
  view,
  update,
  connected,
  setError,
  onBack,
}: {
  view: View;
  update: (v: View) => void;
  connected: boolean;
  setError: (e: string) => void;
  onBack?: () => void;
}) {
  const team = view.teams.find((t) => t.id === view.teamId) || view.teams[0],
    r = team.round;
  const [step, setStep] = useState(r.status === "finished" ? 5 : r.step),
    [help, setHelp] = useState<"hint" | "cei" | "missed" | null>(null),
    [proposal, setProposal] = useState(""),
    [comment, setComment] = useState(""),
    [alternative, setAlternative] = useState(""),
    [busy, setBusy] = useState(false);
  const canConfirm = view.role === "captain" || view.role === "curator",
    editable = canConfirm && r.status === "running" && connected,
    progress = completion(r.plan);
  useEffect(() => {
    if (r.status === "finished") setStep(5);
  }, [r.status]);
  async function command(payload: Record<string, unknown>) {
    const next = await api<View>(`/api/teams/${team.id}/command`, {
      id: uid(),
      ...payload,
    });
    update(next);
    return next;
  }
  async function run(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      await command(payload);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось выполнить действие",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(section: PlanSection, value: unknown, revision: number) {
    try {
      await command({
        type: "section",
        section,
        value,
        expectedRevision: revision,
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409)
        update(await api("/api/state"));
      throw e;
    }
  }
  async function next() {
    const n = Math.min(5, step + 1);
    if (editable)
      await run({ type: "step", step: n, expectedRevision: r.revision });
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function propose() {
    setBusy(true);
    try {
      await command({
        type: "proposal",
        section: sectionsByStep[step],
        text: proposal,
      });
      setProposal("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setBusy(false);
    }
  }
  function openHelp(kind: "hint" | "cei" | "missed") {
    setHelp(kind);
    if (connected && view.role !== "host")
      void run({ type: "hint", step, kind });
  }
  return (
    <main className="workspace">
      <aside className="journey">
        <div className="journey-label">
          {onBack ? (
            <button className="text-button" onClick={onBack}>
              <ArrowLeft size={15} />К командам
            </button>
          ) : (
            <>
              <span className="eyebrow">ВАША КОМАНДА</span>
              <h2>{team.name}</h2>
            </>
          )}
          <p>{view.session.title}</p>
        </div>
        <nav className="steps" aria-label="Этапы игры">
          {stepTitles.map((title, i) => (
            <button
              key={title}
              className={`${step === i ? "active" : ""} ${i < r.step ? "passed" : ""}`}
              onClick={() => setStep(i)}
              aria-current={step === i ? "step" : undefined}
            >
              <span className="step-number">
                {i < r.step ? (
                  <Check size={15} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <span>{title}</span>
              {step === i && <ChevronRight size={14} />}
            </button>
          ))}
        </nav>
        <div className="journey-tip">
          <Lightbulb size={19} />
          <b>Здесь можно передумать</b>
          <p>
            Возвращайтесь к любому шагу. Обсуждение важнее идеального ответа.
          </p>
        </div>
        <div className="journey-footer">
          Корпоративный фреймворк
          <br />
          внедрения изменений
        </div>
      </aside>
      <section className="game-main">
        <div className="game-topline">
          <div>
            <span className="pill">{team.name}</span>
            <span className="case-number">{r.caseData.label}</span>
          </div>
          <Timer round={r} serverNow={view.serverNow} />
        </div>
        {r.status !== "running" && (
          <div className="round-status">
            {r.status === "waiting"
              ? "Ведущий скоро запустит раунд. Пока ознакомьтесь с кейсом."
              : r.status === "paused"
                ? "Ведущий приостановил раунд. Подтверждённые ответы сохранены."
                : "Раунд завершён. Результаты доступны для обсуждения и экспорта."}
          </div>
        )}
        {!connected && (
          <p className="notice warning">
            Нет соединения. Подтверждение ответов станет доступно после
            восстановления связи. Несохранённый ввод остаётся на этом экране.
          </p>
        )}
        {r.event && step !== 4 && (
          <button className="event-notification" onClick={() => setStep(4)}>
            <Sparkles size={17} />
            Появилось событие: {r.event.title}
            <ArrowRight size={17} />
          </button>
        )}
        <article className="game-paper">
          <div className="paper-meta">
            <span>ШАГ {step + 1} ИЗ 6</span>
            <span>Обсуждаем и решаем вместе</span>
          </div>
          <GameScreens
            key={`${r.id}-${step}`}
            round={r}
            team={team}
            step={step}
            editable={editable}
            save={save}
            navigate={setStep}
            canExport={view.role !== "participant"}
          />
          <div className="help-bar">
            <button onClick={() => openHelp("hint")}>
              <Lightbulb size={16} />
              Подсказка
            </button>
            <button onClick={() => openHelp("cei")}>
              <MessageCircle size={16} />
              Спросить ЦЭИ
            </button>
            <button onClick={() => openHelp("missed")}>
              <CircleHelp size={16} />
              Что мы могли упустить?
            </button>
          </div>
          <div className="step-footer">
            <button
              className="text-button"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              <ArrowLeft size={17} />
              Назад
            </button>
            {step < 5 && (
              <button
                className="button primary"
                onClick={() => void next()}
                disabled={busy}
              >
                Продолжить
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </article>
      </section>
      <aside className="collaboration">
        <div className="progress-card">
          <span className="eyebrow">НАШ ОБЩИЙ ПЛАН</span>
          <div className="progress-number">
            {progress.done}
            <span> / {progress.total}</span>
          </div>
          <div className="progress-track">
            <div
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
          <p>
            Элементов заполнено.
            <br />
            Это прогресс, а не оценка решений.
          </p>
        </div>
        <div className="discussion-card">
          <div className="section-heading">
            <h3>Идеи команды</h3>
            <span className="count">{r.proposals.length}</span>
          </div>
          <p className="fine">
            Предлагайте варианты. Капитан или куратор фиксирует общий ответ в
            плане.
          </p>
          {view.role !== "host" && (
            <>
              <Field
                label="Ваше предложение"
                value={proposal}
                onChange={setProposal}
                multiline
                disabled={!connected || r.status !== "running"}
                placeholder="Что стоит добавить или обсудить?"
              />
              <button
                className="button soft small wide"
                onClick={() => void propose()}
                disabled={
                  busy ||
                  !proposal.trim() ||
                  r.status !== "running" ||
                  !connected
                }
              >
                <Send size={15} />
                Предложить команде
              </button>
            </>
          )}
          <div className="proposal-list">
            {r.proposals.length ? (
              r.proposals
                .slice()
                .reverse()
                .map((p) => (
                  <div key={p.id} className="proposal">
                    <b>{p.author}</b>
                    <p>{p.text}</p>
                    {p.status === "pending" && editable ? (
                      <div className="proposal-actions">
                        <button
                          onClick={() =>
                            void run({
                              type: "proposalDecision",
                              proposalId: p.id,
                              status: "accepted",
                            })
                          }
                        >
                          Принять к работе
                        </button>
                        <button
                          onClick={() =>
                            void run({
                              type: "proposalDecision",
                              proposalId: p.id,
                              status: "dismissed",
                            })
                          }
                        >
                          Обсудили
                        </button>
                      </div>
                    ) : (
                      <span className="fine">
                        {
                          {
                            pending: "Ждёт обсуждения",
                            accepted:
                              "Принято к работе — внесите решение в план",
                            dismissed: "Обсуждено",
                          }[p.status]
                        }
                      </span>
                    )}
                  </div>
                ))
            ) : (
              <div className="empty-small">
                <MessageCircle size={23} />
                <p>Здесь появятся ваши предложения.</p>
              </div>
            )}
          </div>
        </div>
        <div className="discussion-card curator">
          <span className="eyebrow">ПОДДЕРЖКА КУРАТОРА</span>
          {r.comments.map((c) => (
            <div className="proposal" key={c.id}>
              <b>{c.author}</b>
              <p>{c.text}</p>
            </div>
          ))}
          {!r.comments.length && (
            <p className="fine">
              Куратор помогает увидеть пробелы и обсудить решения.
            </p>
          )}
          {view.role === "curator" && (
            <>
              <Field
                label="Комментарий команде"
                value={comment}
                onChange={setComment}
                multiline
              />
              <button
                className="button soft small"
                disabled={!comment.trim() || busy || !editable}
                onClick={async () => {
                  await run({ type: "comment", text: comment });
                  setComment("");
                }}
              >
                Оставить комментарий
              </button>
              {r.event && (
                <>
                  <Field
                    label="Обоснование альтернативного решения"
                    value={alternative}
                    onChange={setAlternative}
                    multiline
                  />
                  <button
                    className="button soft small"
                    disabled={!alternative.trim() || busy || !editable}
                    onClick={async () => {
                      await run({ type: "alternative", reason: alternative });
                      setAlternative("");
                    }}
                  >
                    Подтвердить альтернативу
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </aside>
      {help && (
        <div className="modal-backdrop">
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-label={help === "cei" ? "Спросить ЦЭИ" : "Помощь команде"}
          >
            <button
              className="icon-button modal-close"
              onClick={() => setHelp(null)}
              aria-label="Закрыть подсказку"
            >
              <X size={20} />
            </button>
            <span className="modal-symbol">
              <Lightbulb size={25} />
            </span>
            <span className="eyebrow">РЯДОМ НА КАЖДОМ ШАГЕ</span>
            <h2>
              {
                {
                  hint: "Ориентир для обсуждения",
                  cei: "Поддержка ЦЭИ",
                  missed: "Посмотрим чуть шире",
                }[help]
              }
            </h2>
            <p>{r.hints[step][help]}</p>
            {help === "missed" && progress.missing.length > 0 && (
              <ul>
                {progress.missing.slice(0, 3).map((m) => (
                  <li key={m}>
                    {m}: проверьте, что команда обсудила этот элемент.
                  </li>
                ))}
              </ul>
            )}
            <div className="source">{r.hints[step].source}</div>
            {help === "cei" && (
              <p className="fine">
                Справка по материалам фреймворка. Сообщение живому ЦЭИ не
                отправляется.
              </p>
            )}
            <button className="button primary" onClick={() => setHelp(null)}>
              Вернуться к обсуждению
              <ArrowRight size={17} />
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
