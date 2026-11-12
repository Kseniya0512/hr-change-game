import PDFDocument from "pdfkit";
import { fileURLToPath } from "node:url";
import type { Round, Team } from "../shared/model.ts";
import { summarySections } from "../shared/summary.ts";
export function renderPlanPdf(team: Team, round: Round): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      bufferPages: true,
      info: {
        Title: `План внедрения — ${team.name}`,
        Author: "Управляй изменением",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.registerFont(
      "regular",
      fileURLToPath(new URL("../assets/fonts/DejaVuSans.ttf", import.meta.url)),
    );
    doc.registerFont(
      "bold",
      fileURLToPath(
        new URL("../assets/fonts/DejaVuSans-Bold.ttf", import.meta.url),
      ),
    );
    doc
      .font("bold")
      .fontSize(21)
      .fillColor("#163d35")
      .text("ПЛАН ВНЕДРЕНИЯ ИЗМЕНЕНИЯ");
    doc.moveDown(0.6);
    doc
      .font("regular")
      .fontSize(11)
      .fillColor("#485b56")
      .text(
        `${team.name} · ${round.caseData.title}\nПервоначальный план по итогам учебного воркшопа\nДата раунда: ${new Date(round.startedAt ?? round.createdAt).toLocaleString("ru-RU", { timeZone: "Europe/Samara" })} (Самара)\nВерсия материалов: ${round.contentVersion}`,
      );
    doc.moveDown(1);
    for (const section of summarySections(round)) {
      if (doc.y > doc.page.height - 130) doc.addPage();
      doc.font("bold").fontSize(12).fillColor("#163d35").text(section.title);
      doc.moveDown(0.4);
      doc
        .font("regular")
        .fontSize(10)
        .fillColor("#293c36")
        .text(section.body, { lineGap: 3 });
      doc.moveDown(1.1);
    }
    const pages = doc.bufferedPageRange();
    for (let n = pages.start; n < pages.start + pages.count; n++) {
      doc.switchToPage(n);
      doc
        .font("regular")
        .fontSize(8)
        .fillColor("#65766f")
        .text(
          `Управляй изменением · ${n + 1} / ${pages.count}`,
          48,
          doc.page.height - 35,
          { lineBreak: false },
        );
    }
    doc.end();
  });
}
