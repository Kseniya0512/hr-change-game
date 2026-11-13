import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Save } from "lucide-react";
import type { Plan, PlanSection, Round } from "../../shared/model.ts";
import { ApiError } from "../api.ts";
import { LocalStorageMode } from "../standalone/StorageMode.tsx";
const drafts = new Map<string, { value: unknown; revision: number; baseValue: unknown }>();
export function clearDrafts() {
  drafts.clear();
}
export function hasDrafts() {
  return drafts.size > 0;
}
export function SectionEditor<K extends PlanSection>({
  section,
  round,
  editable,
  ownsDraft,
  save,
  children,
}: {
  section: K;
  round: Round;
  editable: boolean;
  ownsDraft: boolean;
  save: (
    section: PlanSection,
    value: unknown,
    revision: number,
    baseValue?: unknown,
  ) => Promise<void>;
  children: (
    value: Plan[K],
    change: (value: Plan[K]) => void,
    disabled: boolean,
  ) => ReactNode;
}) {
  const local = useContext(LocalStorageMode);
  const draftKey = `${round.id}:${section}`,
    cached = ownsDraft ? drafts.get(draftKey) : undefined;
  const [draft, setDraft] = useState<Plan[K]>(() =>
      structuredClone(cached ? (cached.value as Plan[K]) : round.plan[section]),
    ),
    [dirty, setDirty] = useState(!!cached),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [conflict, setConflict] = useState(false);
  const revision = useRef(cached?.revision ?? round.revision);
  const baseValue = useRef(structuredClone(cached ? cached.baseValue : round.plan[section]));
  useEffect(() => {
    if (!dirty) {
      setDraft(structuredClone(round.plan[section]));
      revision.current = round.revision;
      baseValue.current = structuredClone(round.plan[section]);
    }
  }, [round.plan, round.revision, section, dirty]);
  const disabled = !editable || busy;
  async function submit(retry = false) {
    setBusy(true);
    setMessage("");
    try {
      await save(section, draft, retry ? round.revision : revision.current,
        retry ? round.plan[section] : baseValue.current);
      drafts.delete(draftKey);
      setDirty(false);
      setConflict(false);
      setMessage(local ? "План сохранён в этом браузере" : "Решение команды сохранено");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Не удалось сохранить");
      if (e instanceof ApiError && e.status === 409) setConflict(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="section-editor">
      {children(
        draft,
        (v) => {
          if (!dirty) {
            revision.current = round.revision;
            baseValue.current = structuredClone(round.plan[section]);
          }
          drafts.set(draftKey, {
            value: structuredClone(v),
            revision: revision.current,
            baseValue: structuredClone(baseValue.current),
          });
          setDraft(v);
          setDirty(true);
          setMessage("");
        },
        disabled,
      )}
      {editable && (
        <div className="save-row">
          <button
            className="button primary small"
            onClick={() => void submit()}
            disabled={busy || !dirty}
          >
            <Save size={16} />
            {busy ? "Сохраняем…" : local ? "Сохранить блок" : "Зафиксировать блок"}
          </button>
          <span className={dirty ? "muted" : "saved"}>
            {dirty ? (
              "Есть несохранённые изменения"
            ) : (
              <>
                <Check size={14} /> {local ? "Сохранено в браузере" : "Подтверждено сервером"}
              </>
            )}
          </span>
        </div>
      )}
      {message && (
        <p className={conflict ? "notice warning" : "notice"} role="status">
          {message}
        </p>
      )}
      {conflict && (
        <div className="conflict">
          <details>
            <summary>Показать актуальный ответ команды</summary>
            <pre>{JSON.stringify(round.plan[section], null, 2)}</pre>
          </details>
          <button
            className="button small"
            onClick={() => {
              drafts.delete(draftKey);
              setDraft(structuredClone(round.plan[section]));
              revision.current = round.revision;
              baseValue.current = structuredClone(round.plan[section]);
              setDirty(false);
              setConflict(false);
              setMessage("Загружен актуальный блок");
            }}
          >
            Загрузить актуальный блок
          </button>
          <button
            className="button small"
            onClick={() => void submit(true)}
            disabled={busy}
          >
            Подтвердить мой вариант после просмотра
          </button>
        </div>
      )}
    </div>
  );
}
