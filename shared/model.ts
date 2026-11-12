export type CaseId = "bonus" | "medical";
export type Role = "host" | "participant" | "captain" | "curator";
export type Stage = "Подготовка" | "Старт" | "Основная часть" | "Завершение";
export type CriterionAnswer = "yes" | "no" | "unknown";
export interface ActionRow {
  id: string;
  text: string;
  stage: Stage;
  owner: string;
  when: string;
}
export interface Stakeholder {
  id: string;
  role: string;
  why: string;
  stage: Stage;
  action: string;
}
export interface Communication {
  id: string;
  audience: string;
  message: string;
  channel: string;
  owner: string;
  when: string;
}
export interface Risk {
  id: string;
  title: string;
  cause: string;
  consequence: string;
  prevention: string;
  response: string;
}
export interface Metric {
  id: string;
  title: string;
  measure: string;
  source: string;
  owner: string;
  when: string;
}
export interface Plan {
  initiative: { purpose: string; outcome: string; change: string };
  assessment: {
    ceiTiming: string;
    criteria: CriterionAnswer[];
    scale: string;
    route: string;
    reason: string;
  };
  stakeholders: Stakeholder[];
  sponsor: { candidate: string; reason: string };
  actions: ActionRow[];
  communications: Communication[];
  risks: Risk[];
  support: {
    channels: string[];
    owner: string;
    escalation: string;
    update: string;
  };
  metrics: Metric[];
  eventResponse: string;
  openQuestions: string;
  ceiQuestions: string;
}
export type PlanSection = keyof Plan;
export interface GameEvent {
  id: string;
  title: string;
  text: string;
  focus: PlanSection;
  prompt: string;
}
export interface CaseData {
  id: CaseId;
  title: string;
  label: string;
  before: string;
  after: string;
  why: string;
  groups: string[];
  notice: string;
  goals: string[];
  actions: string[];
  risks: Risk[];
  metrics: Omit<Metric, "id">[];
  events: GameEvent[];
}
export interface WorkshopContent {
  version: string;
  roles: string[];
  criteria: string[];
  cases: Record<CaseId, CaseData>;
  hints: { hint: string; cei: string; missed: string; source: string }[];
}
export interface Proposal {
  id: string;
  section: PlanSection;
  text: string;
  author: string;
  status: "pending" | "accepted" | "dismissed";
  at: number;
}
export interface Comment {
  id: string;
  text: string;
  author: string;
  at: number;
}
export interface Round {
  id: string;
  caseId: CaseId;
  caseData: CaseData;
  contentVersion: string;
  criteria: string[];
  roles: string[];
  hints: WorkshopContent["hints"];
  revision: number;
  step: number;
  status: "waiting" | "running" | "paused" | "finished";
  remainingMs: number;
  deadline: number | null;
  plan: Plan;
  proposals: Proposal[];
  comments: Comment[];
  event: GameEvent | null;
  alternative: string;
  helpLog: { step: number; kind: string; at: number }[];
}
export interface Team {
  id: string;
  name: string;
  code: string;
  round: Round;
  history: Round[];
}
export interface Session {
  id: string;
  title: string;
  durationMinutes: number;
  content: WorkshopContent;
  teams: Team[];
  createdAt: number;
}
export interface Access {
  role: Role;
  sessionId: string;
  teamId?: string;
  name: string;
}
export interface View {
  role: Role;
  teamId?: string;
  name: string;
  session: Pick<Session, "id" | "title" | "durationMinutes" | "content">;
  teams: Team[];
  serverNow: number;
}
export interface Invites {
  sessionId: string;
  hostInvite: string;
  teams: {
    id: string;
    name: string;
    code: string;
    participantInvite: string;
    captainInvite: string;
    curatorInvite: string;
  }[];
}
export const stages: Stage[] = [
  "Подготовка",
  "Старт",
  "Основная часть",
  "Завершение",
];
export const stepTitles = [
  "Получена инициатива",
  "Оценка изменения",
  "Кто участвует?",
  "Собери план внедрения",
  "Неожиданное событие",
  "Наш план готов",
];
export const roleLabels: Record<Role, string> = {
  host: "Ведущий",
  participant: "Участник",
  captain: "Капитан",
  curator: "Куратор команды",
};
