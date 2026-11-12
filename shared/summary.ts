import type { Round } from "./model.ts";
import { frameworkResult } from "./plan.ts";
export function summarySections(r: Round) {
  const p = r.plan;
  const fill = (v: string) => v.trim() || "Нужно уточнить";
  const rows = (values: string[]) =>
    values.length ? values.join("\n\n") : "Пока не заполнено";
  return [
    {
      title: "1. Что меняем",
      body: `Было: ${r.caseData.before}\nСтало: ${r.caseData.after}\nЧто меняется для сотрудников: ${fill(p.initiative.change)}`,
    },
    {
      title: "2. Зачем меняем",
      body: `Причина: ${r.caseData.why}\nЦель: ${fill(p.initiative.purpose)}\nОжидаемый результат: ${fill(p.initiative.outcome)}`,
    },
    {
      title: "3. Применимость фреймворка",
      body: `ЦЭИ: ${fill(p.assessment.ceiTiming)}\n${r.criteria.map((c, i) => `${c}: ${{ yes: "да", no: "нет", unknown: "уточнить" }[p.assessment.criteria[i] || "unknown"]}`).join("\n")}\nВывод по согласованному порогу 2+: ${{ applies: "применим", clarify: "нужно уточнить", inform: "достаточно информирования по чек-листу" }[frameworkResult(p.assessment.criteria)]}. Версия: ${r.contentVersion}`,
    },
    {
      title: "4. Масштаб и маршрут",
      body: `Масштаб: ${fill(p.assessment.scale)}\nМаршрут: ${fill(p.assessment.route)}\nОбоснование: ${fill(p.assessment.reason)}`,
    },
    {
      title: "5. Инициатор и спонсор",
      body: `Инициатор: ${fill(p.stakeholders.find((s) => s.role === "Инициатор")?.action || "")}\nСпонсор: ${fill(p.sponsor.candidate)}\nПолномочия и обоснование: ${fill(p.sponsor.reason)}`,
    },
    {
      title: "6. Участники и их роли",
      body: rows(
        p.stakeholders.map(
          (s) =>
            `${s.role}: ${fill(s.why)}\nЭтап: ${s.stage}. Действие: ${fill(s.action)}`,
        ),
      ),
    },
    {
      title: "7. Ключевые действия по этапам",
      body: rows(
        p.actions.map(
          (a) =>
            `${a.stage}: ${a.text}\nОтветственный: ${fill(a.owner)}. Когда: ${fill(a.when)}`,
        ),
      ),
    },
    {
      title: "8. План коммуникаций",
      body: rows(
        p.communications.map(
          (c) =>
            `${c.audience}: ${fill(c.message)}\nКанал: ${fill(c.channel)}. Ответственный: ${fill(c.owner)}. Когда: ${fill(c.when)}`,
        ),
      ),
    },
    {
      title: "9. Основные риски",
      body: rows(
        p.risks.map(
          (r) =>
            `${r.title}\nПричина: ${fill(r.cause)}\nПоследствие: ${fill(r.consequence)}\nПрофилактика: ${fill(r.prevention)}\nРеакция: ${fill(r.response)}`,
        ),
      ),
    },
    {
      title: "10. Канал поддержки",
      body: `Точки входа: ${p.support.channels.join(", ") || "Нужно уточнить"}\nВладелец ответов: ${fill(p.support.owner)}\nЭскалация: ${fill(p.support.escalation)}\nОбновление информации: ${fill(p.support.update)}`,
    },
    {
      title: "11. Метрики",
      body: rows(
        p.metrics.map(
          (m) =>
            `${m.title}\nЧто измеряем: ${fill(m.measure)}\nИсточник: ${fill(m.source)}. Владелец: ${fill(m.owner)}. Когда: ${fill(m.when)}`,
        ),
      ),
    },
    {
      title: "12. Нерешённые вопросы",
      body: `${fill(p.openQuestions)}\nСобытие: ${r.event?.title || "Пока не открыто"}\nРеакция: ${fill(p.eventResponse)}\nАльтернатива, подтверждённая куратором: ${r.alternative || "Не зафиксирована"}`,
    },
    { title: "13. Что уточнить совместно с ЦЭИ", body: fill(p.ceiQuestions) },
  ];
}
