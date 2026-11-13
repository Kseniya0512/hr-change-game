import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  Lightbulb,
  Sparkles,
  Target,
} from "lucide-react";
import type {
  Plan,
  PlanSection,
  Round,
  Stage,
  Team,
} from "../../shared/model.ts";
import { frameworkResult, completion, preparedResponses } from "../../shared/plan.ts";
import { summarySections } from "../../shared/summary.ts";
import { uid } from "../api.ts";
import {
  AddButton,
  Choice,
  Field,
  RemoveButton,
  Select,
  StageSelect,
} from "./Fields.tsx";
import { SectionEditor } from "./SectionEditor.tsx";
import { RiskLinks } from "./RiskLinks.tsx";
export type SaveSection = (
  section: PlanSection,
  value: unknown,
  revision: number,
) => Promise<void>;
type Props = {
  round: Round;
  team: Team;
  step: number;
  editable: boolean;
  ownsDraft: boolean;
  save: SaveSection;
  navigate: (step: number) => void;
  canExport: boolean;
};
export function GameScreens({
  round: r,
  team,
  step,
  editable,
  ownsDraft,
  save,
  navigate,
  canExport,
}: Props) {
  const c = r.caseData;
  if (step === 0)
    return (
      <>
        <div className="case-lead">
          <span className="eyebrow">{c.label}</span>
          <h2>{c.title}</h2>
          <p>
            Получена инициатива. Договоритесь, что меняется и к какому
            результату нужно прийти.
          </p>
        </div>
        <div className="before-after">
          <div>
            <span>БЫЛО</span>
            <p>{c.before}</p>
          </div>
          <div>
            <span>СТАЛО</span>
            <p>{c.after}</p>
          </div>
        </div>
        <div className="context-grid">
          <div>
            <b>Почему меняем</b>
            <p>{c.why}</p>
          </div>
          <div>
            <b>Кого может затронуть</b>
            <p>{c.groups.join(" · ")}</p>
          </div>
        </div>
        <div className="notice">
          <Lightbulb size={18} />
          {c.notice}
        </div>
        <SectionEditor
          section="initiative"
          round={r}
          editable={editable}
          ownsDraft={ownsDraft}
          save={save}
        >
          {(v, set, d) => (
            <>
              <h3>Какую задачу решаем?</h3>
              <p className="muted">
                Выберите направление и уточните формулировку вместе.
              </p>
              <Choice
                items={c.goals}
                value={v.purpose}
                onChange={(purpose) => set({ ...v, purpose })}
                disabled={d}
              />
              <Field
                label="Цель изменения"
                value={v.purpose}
                onChange={(purpose) => set({ ...v, purpose })}
                disabled={d}
                multiline
              />
              <div className="field-grid">
                <Field
                  label="Ожидаемый результат"
                  value={v.outcome}
                  onChange={(outcome) => set({ ...v, outcome })}
                  disabled={d}
                  multiline
                />
                <Field
                  label="Что меняется для сотрудников"
                  value={v.change}
                  onChange={(change) => set({ ...v, change })}
                  disabled={d}
                  multiline
                />
              </div>
            </>
          )}
        </SectionEditor>
      </>
    );
  if (step === 1)
    return (
      <>
        <ScreenLead
          tag="СНАЧАЛА — РАЗОБРАТЬСЯ"
          title="Оценка изменения"
          text="Оцените инициативу вместе с ЦЭИ. Определите охват и способ внедрения."
        />
        <SectionEditor
          section="assessment"
          round={r}
          editable={editable}
          ownsDraft={ownsDraft}
          save={save}
        >
          {(v, set, d) => (
            <>
              <h3>Когда уведомляем ЦЭИ?</h3>
              <Choice
                items={[
                  "При планировании инициативы",
                  "После готового плана",
                  "После объявления",
                  "При первых жалобах",
                ]}
                value={v.ceiTiming}
                onChange={(ceiTiming) => set({ ...v, ceiTiming })}
                disabled={d}
              />
              {v.ceiTiming && v.ceiTiming !== "При планировании инициативы" && (
                <p className="notice warning">
                  ЦЭИ подключается до оценки и подготовки плана: инициатор или
                  исполнитель уведомляет о планируемом изменении. Обсудите и
                  скорректируйте последовательность.
                </p>
              )}
              <div className="section-heading">
                <h3>Нужен ли фреймворк?</h3>
                <span className="pill mint">2 и более «да»</span>
              </div>
              <p className="muted">
                8 критериев корпоративной презентации. Неизвестное оставляйте
                вопросом для уточнения.
              </p>
              <div className="criteria">
                {r.criteria.map((criterion, i) => (
                  <label key={i} className="criterion">
                    <span>
                      <i>{String(i + 1).padStart(2, "0")}</i>
                      {criterion}
                    </span>
                    <select
                      aria-label={criterion}
                      disabled={d}
                      value={v.criteria[i]}
                      onChange={(e) =>
                        set({
                          ...v,
                          criteria: v.criteria.map((a, n) =>
                            n === i ? (e.target.value as typeof a) : a,
                          ),
                        })
                      }
                    >
                      <option value="unknown">Нужно уточнить</option>
                      <option value="yes">Да</option>
                      <option value="no">Нет</option>
                    </select>
                  </label>
                ))}
              </div>
              <div className="assessment-result">
                <CheckCircle2 size={20} />
                <div>
                  <b>
                    {
                      {
                        applies: "Есть основания применять фреймворк",
                        clarify: "Нужно уточнить критерии",
                        inform: "По чек-листу достаточно информирования",
                      }[frameworkResult(v.criteria)]
                    }
                  </b>
                  <p>
                    Вывод относится к чек-листу. Окончательную оценку инициатор
                    проводит совместно с ЦЭИ.
                  </p>
                </div>
              </div>
              <h3>Масштаб изменения</h3>
              <Choice
                items={["Вся компания", "Подразделение", "Отдельная группа"]}
                value={v.scale}
                onChange={(scale) => set({ ...v, scale })}
                disabled={d}
              />
              {v.scale && v.scale !== "Вся компания" && (
                <p className="notice warning">
                  По условиям этого кейса изменение затрагивает всю компанию.
                  Этапность запуска обсуждается отдельно.
                </p>
              )}
              <h3>Маршрут внедрения</h3>
              <Choice
                items={[
                  "Единый запуск",
                  "Пилот с масштабированием",
                  "Последовательно по группам",
                ]}
                value={v.route}
                onChange={(route) => set({ ...v, route })}
                disabled={d}
              />
              {r.caseId === "medical" &&
                v.route &&
                v.route !== "Единый запуск" && (
                  <p className="notice warning">
                    В кейсе медицинских льгот задан единый запуск. Подготовку
                    можно разделить по аудиториям, сохраняя общую дату.
                  </p>
                )}
              <Field
                label="Почему выбираем этот маршрут"
                value={v.reason}
                onChange={(reason) => set({ ...v, reason })}
                disabled={d}
                multiline
                placeholder="Охват, риски, ограничения и неопределённость…"
              />
            </>
          )}
        </SectionEditor>
      </>
    );
  if (step === 2)
    return (
      <>
        <ScreenLead
          tag="ЛЮДИ, КОТОРЫЕ ПОМОГУТ"
          title="Кто участвует?"
          text="Свяжите каждую роль с конкретным действием. Участников выбирают по задаче, а не для полноты списка."
        />
        <SectionEditor
          section="stakeholders"
          round={r}
          editable={editable}
          ownsDraft={ownsDraft}
          save={save}
        >
          {(rows, set, d) => (
            <>
              <div className="stakeholder-map">
                <div className="map-center">
                  <UsersIcon />
                  <b>Команда изменения</b>
                </div>
                {rows.map((row) => (
                  <span key={row.id} className="map-node">
                    {row.role}
                  </span>
                ))}
                {!rows.length && (
                  <p className="muted">
                    Добавьте нужные роли — карта появится здесь.
                  </p>
                )}
              </div>
              <Select
                label="Добавить роль"
                value=""
                options={r.roles.filter(
                  (role) => !rows.some((row) => row.role === role),
                )}
                disabled={d}
                onChange={(role) =>
                  set([
                    ...rows,
                    {
                      id: uid(),
                      role,
                      why: "",
                      stage: "Подготовка",
                      action: "",
                    },
                  ])
                }
              />
              {rows.map((row, i) => (
                <div className="edit-card" key={row.id}>
                  <div className="section-heading">
                    <h4>{row.role}</h4>
                    {!d && (
                      <RemoveButton
                        onClick={() => set(rows.filter((x) => x.id !== row.id))}
                      />
                    )}
                  </div>
                  <div className="field-grid">
                    <Field
                      label="Зачем нужна эта роль"
                      value={row.why}
                      disabled={d}
                      onChange={(why) =>
                        set(rows.map((x, n) => (n === i ? { ...x, why } : x)))
                      }
                    />
                    <StageSelect
                      value={row.stage}
                      disabled={d}
                      onChange={(stage) =>
                        set(
                          rows.map((x, n) =>
                            n === i ? { ...x, stage: stage as Stage } : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <Field
                    label="Что должна сделать"
                    value={row.action}
                    disabled={d}
                    onChange={(action) =>
                      set(rows.map((x, n) => (n === i ? { ...x, action } : x)))
                    }
                    placeholder={
                      row.role === "Инициатор"
                        ? "Кто выступает инициатором и что делает"
                        : "Действие и ожидаемый вклад"
                    }
                  />
                </div>
              ))}
              <AddButton
                disabled={d}
                onClick={() =>
                  set([
                    ...rows,
                    {
                      id: uid(),
                      role: "Другой участник",
                      why: "",
                      stage: "Подготовка",
                      action: "",
                    },
                  ])
                }
              >
                Другой участник
              </AddButton>
              {rows.some((x) => x.role === "Другой участник") && (
                <p className="fine">
                  Уточните название роли в поле «Зачем нужна эта роль».
                </p>
              )}
            </>
          )}
        </SectionEditor>
        <div className="divider" />
        <SectionEditor
          section="sponsor"
          round={r}
          editable={editable}
          ownsDraft={ownsDraft}
          save={save}
        >
          {(v, set, d) => (
            <>
              <h3>Кого выберем спонсором изменения?</h3>
              <p className="muted">
                Это руководитель, поддерживающий изменение в компании. Куратор
                команды в игре — ваш помощник воркшопа.
              </p>
              <div className="candidate-grid">
                {[
                  [
                    "Кандидат А",
                    "Отвечает за решение",
                    "Есть полномочия, ресурсы и личная заинтересованность. Готов устранять барьеры.",
                  ],
                  [
                    "Кандидат Б",
                    "Хорошо знает процесс",
                    "Сильный эксперт, но не может влиять на бюджет, сроки и решения подразделений.",
                  ],
                  [
                    "Кандидат В",
                    "Обладает высоким статусом",
                    "Формальные полномочия есть, но нет заинтересованности и времени на поддержку.",
                  ],
                ].map(([name, title, text]) => (
                  <button
                    className={`candidate ${v.candidate === name ? "selected" : ""}`}
                    key={name}
                    disabled={d}
                    onClick={() => set({ ...v, candidate: name })}
                  >
                    <span>{name}</span>
                    <b>{title}</b>
                    <p>{text}</p>
                  </button>
                ))}
              </div>
              <Field
                label="Почему этот спонсор подходит"
                value={v.reason}
                onChange={(reason) => set({ ...v, reason })}
                multiline
                disabled={d}
              />
            </>
          )}
        </SectionEditor>
      </>
    );
  if (step === 3)
    return (
      <PlanBuilder
        round={r}
        editable={editable}
        ownsDraft={ownsDraft}
        save={save}
      />
    );
  if (step === 4)
    return (
      <>
        <ScreenLead
          tag="ПРОВЕРКА ПЛАНА В ДЕЙСТВИИ"
          title="Неожиданное событие"
          text="Новая ситуация — повод проверить план и при необходимости его дополнить."
        />
        {r.event ? (
          <>
            <div className="event-card">
              <span className="event-icon">
                <Sparkles size={25} />
              </span>
              <span className="eyebrow">ЕСТЬ НОВОСТИ</span>
              <h3>{r.event.title}</h3>
              <p>{r.event.text}</p>
              <b>{r.event.prompt}</b>
            </div>
            <section className="event-preparation" aria-label="Связь события с планом">
              {preparedResponses(r.plan, r.event).length > 0 ? (
                <>
                  <h3>В плане уже есть связанный ответ</h3>
                  <p>Обсудите, как применить его в этой ситуации.</p>
                  <ul>
                    {preparedResponses(r.plan, r.event).map((text) => <li key={text}>{text}</li>)}
                  </ul>
                </>
              ) : (
                <p>
                  Связанный ответ ещё не отмечен. Покажите подготовленное решение
                  или дополните план. Если решение записано в другом месте,
                  обсудите его с куратором.
                </p>
              )}
            </section>
            <button className="button soft" onClick={() => navigate(3)}>
              Открыть конструктор плана
              <ArrowRight size={17} />
            </button>
            <SectionEditor
              section="eventResponse"
              round={r}
              editable={editable}
              ownsDraft={ownsDraft}
              save={save}
            >
              {(v, set, d) => (
                <Field
                  label="Как действует наша команда"
                  value={v}
                  onChange={set}
                  multiline
                  disabled={d}
                  placeholder="Укажите подготовленное действие или что изменили в плане, кто и что делает дальше."
                />
              )}
            </SectionEditor>
            {r.alternative && (
              <p className="notice">
                <CheckCircle2 size={18} />
                Куратор подтвердил альтернативу: {r.alternative}
              </p>
            )}
          </>
        ) : (
          <div className="empty-state">
            <Sparkles size={36} />
            <h3>Событие ещё не открыто</h3>
            <p>
              Оно появится за 7 минут до окончания или по команде ведущего. Пока
              можно доработать план.
            </p>
            <button className="button soft" onClick={() => navigate(3)}>
              Вернуться к плану
            </button>
          </div>
        )}
      </>
    );
  const complete = completion(r.plan);
  return (
    <>
      <ScreenLead
        tag="ЕСТЬ ОСНОВА ДЛЯ СЛЕДУЮЩЕГО ШАГА"
        title="Наш план готов"
        text="Первоначальный план для общего обсуждения. Пробелы и вопросы — полезная часть результата."
      />
      <div className="result-banner">
        <FileText size={32} />
        <div>
          <b>
            {complete.done} из {complete.total} элементов заполнено
          </b>
          <p>Это полнота плана, а не оценка качества решения.</p>
        </div>
        {canExport && (
          <a
            className="button primary small"
            href={`/api/teams/${team.id}/export.pdf?roundId=${r.id}`}
          >
            <Download size={16} />
            Скачать PDF
          </a>
        )}
      </div>
      <SectionEditor
        section="openQuestions"
        round={r}
        editable={editable}
        ownsDraft={ownsDraft}
        save={save}
      >
        {(v, set, d) => (
          <Field
            label="Нерешённые вопросы"
            value={v}
            onChange={set}
            multiline
            disabled={d}
          />
        )}
      </SectionEditor>
      <SectionEditor
        section="ceiQuestions"
        round={r}
        editable={editable}
        ownsDraft={ownsDraft}
        save={save}
      >
        {(v, set, d) => (
          <Field
            label="Что уточнить совместно с ЦЭИ"
            value={v}
            onChange={set}
            multiline
            disabled={d}
          />
        )}
      </SectionEditor>
      <div className="summary">
        {summarySections(r).map((s) => (
          <details key={s.title} open={s.title.startsWith("1.")}>
            <summary>{s.title}</summary>
            <p>{s.body}</p>
          </details>
        ))}
      </div>
    </>
  );
}
function UsersIcon() {
  return <Target size={23} />;
}
export function ScreenLead({
  tag,
  title,
  text,
}: {
  tag: string;
  title: string;
  text: string;
}) {
  return (
    <div className="screen-lead">
      <span className="eyebrow">{tag}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function PlanBuilder({
  round: r,
  editable,
  ownsDraft,
  save,
}: {
  round: Round;
  editable: boolean;
  ownsDraft: boolean;
  save: SaveSection;
}) {
  const [tab, setTab] = useState(0);
  const tabs = ["Подготовка", "Коммуникации", "Риски", "Поддержка", "Метрики"];
  return (
    <>
      <ScreenLead
        tag="ОТ ОБСУЖДЕНИЯ — К ДЕЙСТВИЯМ"
        title="Собери план внедрения"
        text="Пять рабочих блоков. Каждое действие относится к одному из четырёх этапов фреймворка."
      />
      <div className="builder-tabs" role="tablist">
        {tabs.map((t, i) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === i}
            onClick={() => setTab(i)}
          >
            <span>{String.fromCharCode(1040 + i)}</span>
            {t}
          </button>
        ))}
      </div>
      {tab === 0 && (
        <SectionEditor
          section="actions"
          round={r}
          editable={editable}
          ownsDraft={ownsDraft}
          save={save}
        >
          {(rows, set, d) => (
            <>
              <h3>Что, кто и когда</h3>
              <p className="muted">
                Отметьте действия до объявления и добавьте шаги старта,
                сопровождения и завершения.
              </p>
              <div className="action-bank">
                {r.caseData.actions.map((text, i) => {
                  const selected = rows.some((r) => r.text === text);
                  return (
                    <button
                      className={`action-option ${selected ? "selected" : ""}`}
                      disabled={d || selected}
                      key={text}
                      onClick={() =>
                        set([
                          ...rows,
                          {
                            id: uid(),
                            text,
                            stage:
                              i < 4
                                ? "Подготовка"
                                : i < 6
                                  ? "Старт"
                                  : i === 6
                                    ? "Основная часть"
                                    : "Завершение",
                            owner: "",
                            when: "",
                          },
                        ])
                      }
                    >
                      <span aria-hidden="true">{selected ? "✓" : "+"}</span>
                      {text}
                    </button>
                  );
                })}
              </div>
              {rows.map((row, i) => (
                <div className="edit-card" key={row.id}>
                  <div className="section-heading">
                    <span className="pill">Действие {i + 1}</span>
                    {!d && (
                      <RemoveButton
                        onClick={() => set(rows.filter((x) => x.id !== row.id))}
                      />
                    )}
                  </div>
                  <Field
                    label="Действие"
                    value={row.text}
                    onChange={(text) =>
                      set(rows.map((x, n) => (n === i ? { ...x, text } : x)))
                    }
                    disabled={d}
                  />
                  <div className="field-grid three">
                    <StageSelect
                      value={row.stage}
                      disabled={d}
                      onChange={(stage) =>
                        set(
                          rows.map((x, n) =>
                            n === i ? { ...x, stage: stage as Stage } : x,
                          ),
                        )
                      }
                    />
                    <Field
                      label="Ответственный"
                      value={row.owner}
                      disabled={d}
                      onChange={(owner) =>
                        set(rows.map((x, n) => (n === i ? { ...x, owner } : x)))
                      }
                    />
                    <Field
                      label="Когда"
                      value={row.when}
                      disabled={d}
                      onChange={(when) =>
                        set(rows.map((x, n) => (n === i ? { ...x, when } : x)))
                      }
                      placeholder="Например, до объявления"
                    />
                  </div>
                  <RiskLinks
                    risks={r.caseData.risks}
                    value={row.riskIds}
                    disabled={d}
                    onChange={(riskIds) => set(rows.map((x, n) => n === i ? { ...x, riskIds } : x))}
                  />
                </div>
              ))}
              <AddButton
                disabled={d}
                onClick={() =>
                  set([
                    ...rows,
                    {
                      id: uid(),
                      text: "",
                      stage: "Подготовка",
                      owner: "",
                      when: "",
                    },
                  ])
                }
              >
                Своё действие
              </AddButton>
            </>
          )}
        </SectionEditor>
      )}
      {tab === 1 && (
        <SectionEditor
          section="communications"
          round={r}
          editable={editable}
          ownsDraft={ownsDraft}
          save={save}
        >
          {(rows, set, d) => (
            <>
              <h3>Кому и что говорим</h3>
              <p className="muted">
                Подготовьте руководителей до общего объявления. Сообщения должны
                честно объяснять условия и ограничения.
              </p>
              {rows.map((row, i) => (
                <div className="edit-card" key={row.id}>
                  <div className="section-heading">
                    <span className="pill">Коммуникация {i + 1}</span>
                    {!d && (
                      <RemoveButton
                        onClick={() => set(rows.filter((x) => x.id !== row.id))}
                      />
                    )}
                  </div>
                  <div className="field-grid">
                    <Field
                      label="Аудитория"
                      value={row.audience}
                      disabled={d}
                      onChange={(audience) =>
                        set(
                          rows.map((x, n) =>
                            n === i ? { ...x, audience } : x,
                          ),
                        )
                      }
                    />
                    <Select
                      label="Канал"
                      value={row.channel}
                      options={[
                        "Встреча",
                        "Microsoft Teams",
                        "Письмо",
                        "База знаний",
                        "Другой канал",
                      ]}
                      disabled={d}
                      onChange={(channel) =>
                        set(
                          rows.map((x, n) => (n === i ? { ...x, channel } : x)),
                        )
                      }
                    />
                  </div>
                  <Field
                    label="Основное сообщение"
                    value={row.message}
                    multiline
                    disabled={d}
                    onChange={(message) =>
                      set(rows.map((x, n) => (n === i ? { ...x, message } : x)))
                    }
                  />
                  <div className="field-grid">
                    <Field
                      label="Ответственный"
                      value={row.owner}
                      disabled={d}
                      onChange={(owner) =>
                        set(rows.map((x, n) => (n === i ? { ...x, owner } : x)))
                      }
                    />
                    <Field
                      label="Момент отправки"
                      value={row.when}
                      disabled={d}
                      onChange={(when) =>
                        set(rows.map((x, n) => (n === i ? { ...x, when } : x)))
                      }
                    />
                  </div>
                  <RiskLinks
                    risks={r.caseData.risks}
                    value={row.riskIds}
                    disabled={d}
                    onChange={(riskIds) => set(rows.map((x, n) => n === i ? { ...x, riskIds } : x))}
                  />
                </div>
              ))}
              <AddButton
                disabled={d}
                onClick={() =>
                  set([
                    ...rows,
                    {
                      id: uid(),
                      audience: "",
                      message: "",
                      channel: "",
                      owner: "",
                      when: "",
                    },
                  ])
                }
              >
                Добавить коммуникацию
              </AddButton>
            </>
          )}
        </SectionEditor>
      )}
      {tab === 2 && (
        <SectionEditor
          section="risks"
          round={r}
          editable={editable}
          ownsDraft={ownsDraft}
          save={save}
        >
          {(rows, set, d) => (
            <>
              <h3>Что может пойти иначе?</h3>
              <p className="muted">
                Выберите существенные риски. Для каждого обсудите предупреждение
                и действие при возникновении.
              </p>
              <div className="risk-bank">
                {r.caseData.risks.map((risk) => (
                  <button
                    key={risk.id}
                    className={`risk-choice ${rows.some((x) => x.id === risk.id) ? "selected" : ""}`}
                    disabled={d || rows.some((x) => x.id === risk.id)}
                    onClick={() =>
                      set([...rows, { ...risk, prevention: "", response: "" }])
                    }
                  >
                    <AlertTriangle size={17} />
                    {risk.title}
                  </button>
                ))}
              </div>
              {rows.map((row, i) => (
                <div className="edit-card" key={row.id}>
                  <div className="section-heading">
                    <h4>{row.title || "Свой риск"}</h4>
                    {!d && (
                      <RemoveButton
                        onClick={() => set(rows.filter((x) => x.id !== row.id))}
                      />
                    )}
                  </div>
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
                          "Название риска",
                          "Вероятная причина",
                          "Последствие",
                          "Предупреждающее действие",
                          "Действие при возникновении",
                        ][n]
                      }
                      value={row[key]}
                      multiline={key !== "title"}
                      disabled={d}
                      onChange={(value) =>
                        set(
                          rows.map((x, index) =>
                            index === i ? { ...x, [key]: value } : x,
                          ),
                        )
                      }
                    />
                  ))}
                  {!r.caseData.risks.some((risk) => risk.id === row.id) && (
                    <RiskLinks
                      risks={r.caseData.risks}
                      value={row.riskIds}
                      disabled={d}
                      onChange={(riskIds) => set(rows.map((x, n) => n === i ? { ...x, riskIds } : x))}
                    />
                  )}
                </div>
              ))}
              <AddButton
                disabled={d}
                onClick={() =>
                  set([
                    ...rows,
                    {
                      id: uid(),
                      title: "",
                      cause: "",
                      consequence: "",
                      prevention: "",
                      response: "",
                    },
                  ])
                }
              >
                Свой риск
              </AddButton>
            </>
          )}
        </SectionEditor>
      )}
      {tab === 3 && (
        <SectionEditor
          section="support"
          round={r}
          editable={editable}
          ownsDraft={ownsDraft}
          save={save}
        >
          {(v, set, d) => (
            <>
              <h3>Сотрудник не остаётся с вопросом один</h3>
              <p className="muted">
                У точки поддержки должны быть владелец, порядок эскалации и
                актуальная информация.
              </p>
              <div className="checkbox-grid">
                {[
                  "FAQ",
                  "HR",
                  "Канал вопросов",
                  "Форма обращения",
                  "Руководитель",
                  "Другая точка поддержки",
                ].map((channel) => (
                  <label key={channel}>
                    <input
                      type="checkbox"
                      disabled={d}
                      checked={v.channels.includes(channel)}
                      onChange={(e) =>
                        set({
                          ...v,
                          channels: e.target.checked
                            ? [...v.channels, channel]
                            : v.channels.filter((x) => x !== channel),
                        })
                      }
                    />
                    {channel}
                  </label>
                ))}
              </div>
              <Field
                label="Владелец ответов"
                value={v.owner}
                disabled={d}
                onChange={(owner) => set({ ...v, owner })}
              />
              <Field
                label="Как эскалируем сложные вопросы"
                value={v.escalation}
                multiline
                disabled={d}
                onChange={(escalation) => set({ ...v, escalation })}
              />
              <Field
                label="Как обновляем информацию"
                value={v.update}
                multiline
                disabled={d}
                onChange={(update) => set({ ...v, update })}
              />
            </>
          )}
        </SectionEditor>
      )}
      {tab === 4 && (
        <SectionEditor
          section="metrics"
          round={r}
          editable={editable}
          ownsDraft={ownsDraft}
          save={save}
        >
          {(rows, set, d) => (
            <>
              <h3>Как поймём, что изменение прижилось?</h3>
              <p className="muted">
                Выберите 3–5 показателей понимания, использования, поддержки и
                последствий. Одного факта запуска недостаточно.
              </p>
              <div className="action-bank">
                {r.caseData.metrics.map((m) => (
                  <button
                    key={m.title}
                    className={`action-option ${rows.some((x) => x.title === m.title) ? "selected" : ""}`}
                    disabled={
                      d ||
                      rows.length >= 5 ||
                      rows.some((x) => x.title === m.title)
                    }
                    onClick={() => set([...rows, { ...m, id: uid() }])}
                  >
                    <CheckCircle2 size={17} />
                    {m.title}
                  </button>
                ))}
              </div>
              {rows.map((row, i) => (
                <div className="edit-card" key={row.id}>
                  <div className="section-heading">
                    <h4>{row.title || "Своя метрика"}</h4>
                    {!d && (
                      <RemoveButton
                        onClick={() => set(rows.filter((x) => x.id !== row.id))}
                      />
                    )}
                  </div>
                  {(
                    ["title", "measure", "source", "owner", "when"] as const
                  ).map((key, n) => (
                    <Field
                      key={key}
                      label={
                        [
                          "Показатель",
                          "Что измеряем",
                          "Источник данных",
                          "Владелец метрики",
                          "Момент замера",
                        ][n]
                      }
                      value={row[key]}
                      disabled={d}
                      onChange={(value) =>
                        set(
                          rows.map((x, index) =>
                            index === i ? { ...x, [key]: value } : x,
                          ),
                        )
                      }
                    />
                  ))}
                </div>
              ))}
              <AddButton
                disabled={d || rows.length >= 5}
                onClick={() =>
                  set([
                    ...rows,
                    {
                      id: uid(),
                      title: "",
                      measure: "",
                      source: "",
                      owner: "",
                      when: "",
                    },
                  ])
                }
              >
                Своя метрика
              </AddButton>
              <p className="fine">
                Выбрано {rows.length} из 3–5. В игре планируем измерение,
                реальные HR-данные не загружаем.
              </p>
            </>
          )}
        </SectionEditor>
      )}
    </>
  );
}
