import { test, expect, type Page } from "@playwright/test";
const key = "e2e-test-host-key-not-for-production";
async function join(page: Page, invite: string) {
  await page.goto(`/#invite=${invite}`);
  await page.getByRole("button", { name: "Подключиться", exact: true }).click();
}
test("organizer creates a workshop from the landing page", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Управляй изменением", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Я ведущий" }).click();
  await page.getByLabel("Ключ ведущего").fill(key);
  await page.getByLabel("Название воркшопа").fill("Общий воркшоп");
  await page.getByRole("button", { name: "Создать сессию" }).click();
  await expect(
    page.getByRole("heading", { name: "Пульт ведущего" }),
  ).toBeVisible();
  await expect(
    page.getByText("Общий воркшоп", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Ссылки для подключения")).toBeVisible();
  await page.screenshot({ path: "test-results/host.png", fullPage: true });
});
test("captain confirms, participant receives updates and refresh restores the plan", async ({
  browser,
  request,
}) => {
  const created = await request.post("/api/sessions", {
    data: {
      hostKey: key,
      title: "Синхронный раунд",
      teamCount: 2,
      durationMinutes: 30,
    },
  });
  const data = await created.json();
  const a = await browser.newContext(),
    b = await browser.newContext(),
    h = await browser.newContext();
  const captain = await a.newPage(),
    participant = await b.newPage(),
    host = await h.newPage();
  try {
    await join(host, data.hostInvite);
    await host
      .getByRole("button", { name: "Начать всем", exact: true })
      .click();
    await join(captain, data.teams[0].captainInvite);
    await join(participant, data.teams[0].participantInvite);
    await captain
      .getByLabel("Цель изменения")
      .fill("Организовать понятный переход");
    await captain.getByRole("button", { name: "Зафиксировать блок" }).click();
    await expect(participant.getByLabel("Цель изменения")).toHaveValue(
      "Организовать понятный переход",
    );
    await expect(participant.getByLabel("Цель изменения")).toBeDisabled();
    await participant
      .getByLabel("Ваше предложение")
      .fill("Подготовить руководителей заранее");
    await participant
      .getByRole("button", { name: "Предложить команде" })
      .click();
    await expect(
      captain.getByText("Подготовить руководителей заранее", { exact: true }),
    ).toBeVisible();
    await captain.reload();
    await expect(captain.getByLabel("Цель изменения")).toHaveValue(
      "Организовать понятный переход",
    );
    await captain.getByRole("button", { name: /Оценка изменения/ }).click();
    await expect(captain.getByText("2 и более «да»")).toBeVisible();
    await captain
      .getByRole("button", { name: "Спросить ЦЭИ", exact: true })
      .click();
    await expect(
      captain.getByText(/Инициатор или исполнитель уведомляет ЦЭИ/),
    ).toBeVisible();
    await captain.getByRole("button", { name: "Закрыть подсказку" }).click();
    await captain.screenshot({
      path: "test-results/game-desktop.png",
      fullPage: true,
    });
    await captain.setViewportSize({ width: 390, height: 844 });
    await captain.screenshot({
      path: "test-results/game-mobile.png",
      fullPage: true,
    });
  } finally {
    await a.close();
    await b.close();
    await h.close();
  }
});
test("an unconfirmed draft survives moving between screens", async ({
  page,
  request,
}) => {
  const response = await request.post("/api/sessions", {
    data: {
      hostKey: key,
      title: "Черновик",
      teamCount: 2,
      durationMinutes: 30,
    },
  });
  const data = await response.json();
  await request.post("/api/access", { data: { token: data.hostInvite } });
  await request.post(`/api/sessions/${data.sessionId}/control`, {
    data: { action: "start" },
  });
  await join(page, data.teams[0].captainInvite);
  await page
    .getByLabel("Цель изменения")
    .fill("Ещё обсуждаем эту формулировку");
  await page.getByRole("button", { name: /Оценка изменения/ }).click();
  await page.getByRole("button", { name: /Получена инициатива/ }).click();
  await expect(page.getByLabel("Цель изменения")).toHaveValue(
    "Ещё обсуждаем эту формулировку",
  );
});
test("visible countdown advances without another participant changing the plan", async ({
  page,
  request,
}) => {
  const created = await request.post("/api/sessions", {
    data: { hostKey: key, title: "Таймер", teamCount: 2, durationMinutes: 30 },
  });
  const data = await created.json();
  await request.post("/api/access", { data: { token: data.hostInvite } });
  await request.post(`/api/sessions/${data.sessionId}/control`, {
    data: { action: "start" },
  });
  await join(page, data.teams[0].captainInvite);
  const timer = page.locator(".game-topline .timer");
  const initial = await timer.textContent();
  await expect
    .poll(() => timer.textContent(), { timeout: 5000 })
    .not.toBe(initial);
});
test("medical case completes all six screens, curator accepts an alternative and PDF is downloadable", async ({
  browser,
  request,
}) => {
  const response = await request.post("/api/sessions", {
    data: {
      hostKey: key,
      title: "Медицинские льготы",
      teamCount: 3,
      durationMinutes: 30,
    },
  });
  const data = await response.json();
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
    browser.newContext(),
  ]);
  const [captain, host, curator] = await Promise.all(
    contexts.map((c) => c.newPage()),
  );
  try {
    await join(host, data.hostInvite);
    await host
      .getByRole("button", { name: "Начать всем", exact: true })
      .click();
    await join(captain, data.teams[1].captainInvite);
    await join(curator, data.teams[1].curatorInvite);
    await expect(
      captain.getByRole("heading", {
        name: "Переход от ДМС к возмещению",
        exact: true,
      }),
    ).toBeVisible();
    await captain
      .getByLabel("Цель изменения")
      .fill("Понятный переход с доступной поддержкой");
    await captain
      .getByLabel("Ожидаемый результат")
      .fill("Сотрудники знают документы и сроки");
    await captain
      .getByLabel("Что меняется для сотрудников")
      .fill("Пользователи ДМС переходят на возмещение");
    await captain.getByRole("button", { name: "Зафиксировать блок" }).click();
    await captain.getByRole("button", { name: /Оценка изменения/ }).click();
    await captain
      .getByRole("button", { name: "При планировании инициативы", exact: true })
      .click();
    for (let i = 0; i < 8; i++)
      await captain
        .locator(".criterion select")
        .nth(i)
        .selectOption(i < 3 ? "yes" : "no");
    await captain
      .getByRole("button", { name: "Вся компания", exact: true })
      .click();
    await captain
      .getByRole("button", { name: "Единый запуск", exact: true })
      .click();
    await captain
      .getByLabel("Почему выбираем этот маршрут")
      .fill("Единая дата задана условием; подготовка разделена по аудиториям");
    await captain.getByRole("button", { name: "Зафиксировать блок" }).click();
    await captain.getByRole("button", { name: /Кто участвует/ }).click();
    await captain.getByLabel("Добавить роль").selectOption("Инициатор");
    await captain.getByLabel("Зачем нужна эта роль").fill("Владеет изменением");
    await captain
      .getByLabel("Что должна сделать")
      .fill("Команда компенсаций и льгот уточняет условия и обоснование");
    await captain
      .locator(".section-editor")
      .nth(0)
      .getByRole("button", { name: "Зафиксировать блок" })
      .click();
    await captain.getByRole("button", { name: /Кандидат А/ }).click();
    await captain
      .getByLabel("Почему этот спонсор подходит")
      .fill("Есть полномочия, ресурсы и приверженность");
    await captain
      .locator(".section-editor")
      .nth(1)
      .getByRole("button", { name: "Зафиксировать блок" })
      .click();
    await captain
      .getByRole("button", { name: /Собери план внедрения/ })
      .click();
    for (const text of [
      "Проверить условия действующих полисов и переходный период",
      "Подготовить руководителей до общего объявления",
      "Назначить владельца ответов и эскалации",
      "Оценить результат и передать поддержку владельцу процесса",
    ])
      await captain.getByRole("button", { name: text, exact: true }).click();
    for (let i = 0; i < 4; i++) {
      await captain
        .getByLabel("Ответственный", { exact: true })
        .nth(i)
        .fill("Ответственный HR");
      await captain
        .getByLabel("Когда", { exact: true })
        .nth(i)
        .fill(
          ["До старта", "Перед объявлением", "В ходе перехода", "По итогам"][i],
        );
    }
    await captain.getByRole("button", { name: "Зафиксировать блок" }).click();
    await captain.getByRole("tab", { name: /Коммуникации/ }).click();
    await captain
      .getByRole("button", { name: "Добавить коммуникацию" })
      .click();
    await captain.getByLabel("Аудитория").fill("Руководители");
    await captain.getByLabel("Канал", { exact: true }).selectOption("Встреча");
    await captain
      .getByLabel("Основное сообщение")
      .fill("Условия перехода, порядок возмещения и вопросы сотрудников");
    await captain.getByLabel("Ответственный", { exact: true }).fill("HR");
    await captain.getByLabel("Момент отправки").fill("До общего объявления");
    await captain.getByRole("button", { name: "Зафиксировать блок" }).click();
    await captain.getByRole("tab", { name: /Риски/ }).click();
    await captain
      .getByRole("button", {
        name: "Трудно сначала оплатить лечение",
        exact: true,
      })
      .click();
    await captain
      .getByLabel("Предупреждающее действие")
      .fill("Оценить последствия и проверить возможную поддержку");
    await captain
      .getByLabel("Действие при возникновении")
      .fill("Передать вопрос владельцу программы");
    await captain.getByRole("button", { name: "Зафиксировать блок" }).click();
    await captain.getByRole("tab", { name: /Поддержка/ }).click();
    await captain.getByLabel("FAQ", { exact: true }).check();
    await captain.getByLabel("Владелец ответов").fill("HR");
    await captain
      .getByLabel("Как эскалируем сложные вопросы")
      .fill("Владельцу программы");
    await captain
      .getByLabel("Как обновляем информацию")
      .fill("После разбора обращений");
    await captain.getByRole("button", { name: "Зафиксировать блок" }).click();
    await captain.getByRole("tab", { name: /Метрики/ }).click();
    for (const text of [
      "Понимание порядка возмещения",
      "Заявления с первого раза",
      "Фактический срок возмещения",
    ])
      await captain.getByRole("button", { name: text, exact: true }).click();
    await captain.getByRole("button", { name: "Зафиксировать блок" }).click();
    await host
      .locator(".team-card")
      .nth(1)
      .getByRole("button", { name: "Открыть событие" })
      .click();
    await captain.getByRole("button", { name: /Неожиданное событие/ }).click();
    await expect(captain.locator(".event-card")).toBeVisible();
    await captain
      .getByLabel("Как действует наша команда")
      .fill(
        "Используем подготовленное действие и уточняем поддержку с владельцем программы",
      );
    await captain.getByRole("button", { name: "Зафиксировать блок" }).click();
    await curator
      .getByLabel("Обоснование альтернативного решения")
      .fill("Обоснованная последовательность с проверкой условий");
    await curator
      .getByRole("button", { name: "Подтвердить альтернативу" })
      .click();
    await expect(
      captain.getByText(/Куратор подтвердил альтернативу/),
    ).toBeVisible();
    await captain.getByRole("button", { name: /Наш план готов/ }).click();
    await captain
      .getByLabel("Что уточнить совместно с ЦЭИ")
      .fill("Проверить план перехода");
    await captain
      .locator(".section-editor")
      .nth(1)
      .getByRole("button", { name: "Зафиксировать блок" })
      .click();
    const download = captain.waitForEvent("download");
    await captain.getByRole("link", { name: "Скачать PDF" }).click();
    expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
    await host
      .locator(".team-card")
      .nth(1)
      .getByRole("button", { name: "Завершить", exact: true })
      .click();
    await expect(
      captain.getByText(
        "Раунд завершён. Результаты доступны для обсуждения и экспорта.",
      ),
    ).toBeVisible();
    await host
      .locator(".team-card")
      .nth(1)
      .getByRole("button", { name: "Следующий кейс" })
      .click();
    await expect(
      captain.getByText("Кейс 01 · Доход сотрудников").first(),
    ).toBeVisible();
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
