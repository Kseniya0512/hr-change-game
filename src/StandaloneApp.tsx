import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Download, Info, MessageSquare, Lightbulb, Pause, Play, Sparkles, X } from 'lucide-react';
import type { CaseId, PlanSection, Round, Team } from '../shared/model.ts';
import { stepTitles } from '../shared/model.ts';
import { chooseEvent, completion, remaining } from '../shared/plan.ts';
import { summarySections } from '../shared/summary.ts';
import { GameScreens } from './components/GameScreens.tsx';
import { Timer } from './components/Game.tsx';
import { hasDrafts } from './components/SectionEditor.tsx';
import { createStandaloneStore } from './standalone/store.ts';
import { LocalStorageMode } from './standalone/StorageMode.tsx';
import { ApiError } from './api.ts';

export default function StandaloneApp() {
 const [caseId, setCaseId] = useState<CaseId>(() => new URLSearchParams(location.hash.slice(1)).get('case') === 'medical' ? 'medical' : 'bonus');
 const [round, setRound] = useState<Round | null>(null);
 const [error, setError] = useState('');
 const [help, setHelp] = useState<'hint' | 'cei' | 'missed' | null>(null);
 const current = useRef<Round | null>(null);
 const store = useRef<ReturnType<typeof createStandaloneStore> | null>(null);
 function show(next: Round) { current.current = next; setRound(next); }
 function load(id: CaseId) {
  setError(''); setHelp(null);
  try {
   store.current ??= createStandaloneStore(window.localStorage);
   show(store.current.load(id));
  } catch (e) { current.current = null; setRound(null); setError(e instanceof Error ? e.message : 'Не удалось открыть план'); }
 }
 useEffect(() => { load(caseId); }, [caseId]);
 useEffect(() => {
  const timer = setInterval(() => {
   const value = current.current;
   if (!value || !store.current) return;
   try { const next = store.current.settle(value); if (next !== value) show(next); }
   catch (e) { setError(e instanceof Error ? e.message : 'Не удалось обновить таймер'); }
  }, 1000);
  const unload = (event: BeforeUnloadEvent) => { if (hasDrafts()) { event.preventDefault(); event.returnValue = ''; } };
  window.addEventListener('beforeunload', unload);
  return () => { clearInterval(timer); window.removeEventListener('beforeunload', unload); };
 }, []);
 function persist(next: Round) {
  if (!store.current) throw new Error('Хранилище ещё не готово');
  const saved = store.current.save(next);
  show(saved); setError('');
 }
 function change(next: Round) {
  try { persist(next); }
  catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить план'); }
 }
 async function save(section: PlanSection, value: unknown, revision: number, baseValue?: unknown) {
  const valueNow = current.current;
  if (!valueNow || !store.current) throw new Error('План не открыт');
  const latest = store.current.load(valueNow.caseId);
  if (revision !== latest.revision && (baseValue === undefined || JSON.stringify(baseValue) !== JSON.stringify(latest.plan[section]))) {
   show(latest);
   throw new ApiError(409, 'Ответ изменился в другой вкладке. Просмотрите актуальный блок перед повторным сохранением.');
  }
  persist({ ...latest, plan: { ...latest.plan, [section]: value } });
 }
 function navigate(step: number) {
  const value = current.current;
  if (value) change({ ...value, step });
  setHelp(null);
  window.scrollTo({ top: 0, behavior: 'smooth' });
 }
 function print() { window.print(); }
 const team: Team | null = round ? { id: 'individual', name: 'Мой план', code: '', round, history: [] } : null;
 const progress = round ? completion(round.plan) : null;
 return <LocalStorageMode.Provider value={true}>
  <div className="standalone-shell">
   <header className="topbar standalone-header">
    <a className="brand" href="#" aria-label="РТК ИТ — Управляй изменением" onClick={(e) => e.preventDefault()}><span className="brand-symbol"><MessageSquare size={23}/></span><span className="brand-word">РТК ИТ<small>ЛЮДИ И ИЗМЕНЕНИЯ</small></span><span className="brand-divider"/><span className="brand-caption">Практика управления<br/>изменениями в HR</span></a>
    <span className="standalone-mode"><i/>Индивидуальный режим</span>
   </header>
   <div className="standalone-controls">
    <div className="standalone-intro"><span className="eyebrow">ПРАКТИКА · КОРПОРАТИВНЫЙ ФРЕЙМВОРК</span><h1>Управляй <span>изменением</span></h1><p>Два HR-кейса, шесть шагов и первоначальный план внедрения. Примените фреймворк на практике в своём темпе.</p></div>
    <div className="standalone-toolbar">
     <label className="field"><span>Учебный кейс</span><select aria-label="Учебный кейс" value={caseId} onChange={(e) => {
      const id = e.target.value as CaseId;
      history.replaceState(null, '', `#case=${id}`); setCaseId(id);
     }}><option value="bonus">Изменение системы премирования</option><option value="medical">Изменение медицинских льгот</option></select></label>
     {round && <>
      <button className="button soft small" onClick={() => {
       const left = remaining(round);
       change(round.status === 'running'
        ? { ...round, status: 'paused', remainingMs: left, deadline: null }
        : { ...round, status: 'running', startedAt: round.startedAt ?? Date.now(), deadline: Date.now() + (left || 30 * 60000), remainingMs: left || 30 * 60000 });
      }}>{round.status === 'running' ? <Pause size={16}/> : <Play size={16}/>} {round.status === 'running' ? 'Пауза' : 'Запустить таймер'}</button>
      <button className="button soft small" onClick={() => change({ ...round, event: round.event ?? chooseEvent(round.caseData, round.plan), step: 4 })}><Sparkles size={16}/>Открыть событие</button>
      <button className="button primary small" onClick={print}><Download size={16}/>Сохранить как PDF</button>
     </>}
    </div>
    <p className="fine">Нажимайте «Сохранить блок» после редактирования. В PDF попадут сохранённые ответы; в окне печати выберите «Сохранить как PDF».</p>
    <p className="standalone-notice"><Info size={17}/><span>План хранится только в этом браузере. Каждый работает со своим планом; общая синхронизация не используется.</span></p>
   </div>
   {error && <div className="notice warning standalone-error" role="alert">{error}{!round && <button className="button small" onClick={() => load(caseId)}>Повторить попытку</button>}</div>}
   {round && team && progress && <div className="standalone-workspace">
    <aside className="journey">
     <div className="journey-label"><span className="eyebrow">МОЙ ПЛАН</span><h2>{progress.done} / {progress.total}</h2><p>Заполненность, а не оценка решения</p><div className="progress-track"><div style={{width: `${progress.done/progress.total*100}%`}}/></div></div>
     <nav className="steps" aria-label="Этапы игры">{stepTitles.map((title, i) => <button key={title} className={round.step === i ? 'active' : ''} aria-current={round.step === i ? 'step' : undefined} onClick={() => navigate(i)}><span className="step-number">{String(i+1).padStart(2,'0')}</span><span>{title}</span></button>)}</nav>
     <div className="journey-tip"><Lightbulb size={19}/><b>Можно вернуться к любому шагу</b><p>Оба кейса сохраняются отдельно. Обсудите итоговый план на воркшопе.</p></div>
    </aside>
    <section className="game-main">
     <div className="game-topline"><span className="case-number">{round.caseData.label}</span><Timer round={round} serverNow={Date.now()}/></div>
     {round.status === 'finished' && <p className="notice">Время раунда закончилось. Вы можете продолжить работу и дополнить план.</p>}
     <article className="game-paper">
      <div className="paper-meta"><span>ШАГ {round.step+1} ИЗ 6</span><span>От идеи к плану внедрения</span></div>
      <GameScreens key={`${round.id}-${round.step}`} round={round} team={team} step={round.step} editable={true} ownsDraft={true} save={save} navigate={navigate} canExport={false}/>
      <div className="help-bar">{(['hint','cei','missed'] as const).map((kind,i) => <button key={kind} onClick={() => setHelp(kind)}><Lightbulb size={16}/>{['Подсказка','Спросить ЦЭИ','Что мы могли упустить?'][i]}</button>)}</div>
      <div className="step-footer"><button className="text-button" disabled={round.step===0} onClick={() => navigate(round.step-1)}><ArrowLeft size={17}/>Назад</button>{round.step<5 && <button className="button primary" onClick={() => navigate(round.step+1)}>Продолжить<ArrowRight size={17}/></button>}</div>
     </article>
    </section>
   </div>}
   {help && round && <div className="modal-backdrop"><section className="help-modal" role="dialog" aria-modal="true" aria-label="Помощь по фреймворку"><button className="icon-button modal-close" aria-label="Закрыть подсказку" onClick={() => setHelp(null)}><X size={20}/></button><h2>{help === 'cei' ? 'Поддержка ЦЭИ' : 'Ориентир для обсуждения'}</h2><p>{round.hints[round.step][help]}</p><div className="source">{round.hints[round.step].source}</div><button className="button primary" onClick={() => setHelp(null)}>Вернуться к плану</button></section></div>}
   {round && <section className="standalone-print"><h1>ПЛАН ВНЕДРЕНИЯ ИЗМЕНЕНИЯ</h1><p>{round.caseData.title} · Индивидуальный учебный план</p><p>Версия материалов: {round.contentVersion}</p>{summarySections(round).map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>)}</section>}
  </div>
 </LocalStorageMode.Provider>;
}
