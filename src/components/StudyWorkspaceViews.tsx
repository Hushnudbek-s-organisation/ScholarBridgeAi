"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Folder, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { isStudyDate, type StudyNode } from "@/lib/study-map";

export const studyTools = {
  en: {
    database: "Databases", roadmap: "Roadmaps", files: "Files", trash: "Trash", importFolder: "Import Markdown folder",
    restore: "Restore", purge: "Delete forever", purgeConfirm: "Permanently delete this note or card?", limit: "120 notes and cards fit in this workspace, including Trash.",
    importLimit: "Choose up to 50 Markdown or text files per import.", payloadLimit: "These notes are too large to import together. Choose fewer files.", noFiles: "No Markdown or text files found.", noFolder: "Unfiled",
    title: "Title", topic: "Topic", folder: "Folder", tags: "Tags", date: "Date", status: "Status", pending: "In progress",
    prev: "Previous month", next: "Next month", today: "Today", noEvents: "No items on this date.", search: "Search",
    start: "Start focus timer", pause: "Pause focus timer", reset: "Reset focus timer", finished: "Focus session complete",
    lock: "Lock workspace", lockConfirm: "Lock the workspace by signing out?", back: "Previous selection", forward: "Next selection",
    hideDetails: "Hide details", showDetails: "Show details", textSize: "Larger note text", links: "links", notes: "notes",
  },
  uz: {
    database: "Jadvallar", roadmap: "Yo‘l xaritalari", files: "Fayllar", trash: "Savatcha", importFolder: "Markdown papkasini yuklash",
    restore: "Tiklash", purge: "Butunlay o‘chirish", purgeConfirm: "Qayd yoki karta butunlay o‘chirilsinmi?", limit: "Savatcha bilan birga 120 ta qayd va karta saqlash mumkin.",
    importLimit: "Bir martada 50 tagacha Markdown yoki matn faylini tanlang.", payloadLimit: "Bu qaydlar birga yuklash uchun juda katta. Kamroq fayl tanlang.", noFiles: "Markdown yoki matn fayli topilmadi.", noFolder: "Papkasiz",
    title: "Sarlavha", topic: "Mavzu", folder: "Papka", tags: "Teglar", date: "Sana", status: "Holat", pending: "Jarayonda",
    prev: "Oldingi oy", next: "Keyingi oy", today: "Bugun", noEvents: "Bu sanada yozuv yo‘q.", search: "Qidiruv",
    start: "Fokus taymerini boshlash", pause: "Fokus taymerini to‘xtatish", reset: "Fokus taymerini tiklash", finished: "Fokus vaqti tugadi",
    lock: "Xaritani qulflash", lockConfirm: "Xaritani qulflash uchun hisobdan chiqilsinmi?", back: "Oldingi tanlov", forward: "Keyingi tanlov",
    hideDetails: "Tafsilotlarni yashirish", showDetails: "Tafsilotlarni ko‘rsatish", textSize: "Qayd matnini kattalashtirish", links: "ta havola", notes: "ta qayd",
  },
  ru: {
    database: "Таблицы", roadmap: "Планы", files: "Файлы", trash: "Корзина", importFolder: "Импорт папки Markdown",
    restore: "Восстановить", purge: "Удалить навсегда", purgeConfirm: "Удалить заметку или карточку навсегда?", limit: "До 120 заметок и карточек, включая корзину.",
    importLimit: "Выберите до 50 файлов Markdown или текста.", payloadLimit: "Заметки слишком велики. Выберите меньше файлов для импорта.", noFiles: "Файлы Markdown или текста не найдены.", noFolder: "Без папки",
    title: "Название", topic: "Тема", folder: "Папка", tags: "Теги", date: "Дата", status: "Статус", pending: "В работе",
    prev: "Предыдущий месяц", next: "Следующий месяц", today: "Сегодня", noEvents: "На эту дату записей нет.", search: "Поиск",
    start: "Запустить таймер фокуса", pause: "Поставить таймер на паузу", reset: "Сбросить таймер", finished: "Время фокуса завершено",
    lock: "Заблокировать карту", lockConfirm: "Выйти из аккаунта и заблокировать карту?", back: "Предыдущий выбор", forward: "Следующий выбор",
    hideDetails: "Скрыть детали", showDetails: "Показать детали", textSize: "Увеличить текст заметок", links: "связей", notes: "заметок",
  },
};

type Labels = typeof studyTools.en;
export type WorkspaceRow = { node: StudyNode; topic: string; folder: string; tags: string; date: string; status: string };
type RowProps = { rows: WorkspaceRow[]; labels: Labels; selected: string; open: (id: string) => void; empty: string };
const dateKey = (date: Date) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(value => String(value).padStart(2, "0")).join("-");

export function StudyCalendar({ rows, labels, selected, open, daily, onDaily, locale }: RowProps & {
  locale: string; daily: string; onDaily: (day: string) => void;
}) {
  const [date, setDate] = useState(() => new Date());
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const today = dateKey(new Date());
  const active = dateKey(date);
  const monthTitle = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(first);
  const dayTitle = new Intl.DateTimeFormat(locale, { dateStyle: "full" });
  const weekdays = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const events = new Map<string, WorkspaceRow[]>();
  for (const row of rows) {
    if (isStudyDate(row.date)) events.set(row.date, [...(events.get(row.date) ?? []), row]);
  }

  return <div className="sb-study-rows">
    <div className="sb-study-month-header">
      <Button type="button" variant="ghost" aria-label={labels.prev} onClick={() => setDate(new Date(year, month - 1, 1))}><ChevronLeft size={18} /></Button>
      <h2 aria-live="polite">{monthTitle}</h2>
      <Button type="button" variant="ghost" aria-label={labels.next} onClick={() => setDate(new Date(year, month + 1, 1))}><ChevronRight size={18} /></Button>
      <Button type="button" variant="outline" onClick={() => setDate(new Date())}>{labels.today}</Button>
    </div>
    <div className="sb-study-month">
      {Array.from({ length: 7 }, (_, index) => <span key={index}>{weekdays.format(new Date(2024, 0, index + 1))}</span>)}
      {Array.from({ length: offset }, (_, index) => <span key={`offset:${index}`} aria-hidden />)}
      {Array.from({ length: days }, (_, index) => {
        const day = new Date(year, month, index + 1);
        const key = dateKey(day);
        const count = events.get(key)?.length;
        return <Button type="button" variant="unstyled" key={key} aria-current={key === today ? "date" : undefined}
          aria-pressed={key === active} aria-label={dayTitle.format(day)} onClick={() => setDate(day)}>
          {index + 1}{count ? <small>{count}</small> : null}
        </Button>;
      })}
    </div>
    <div className="sb-study-month-header">
      <h3>{dayTitle.format(date)}</h3>
      <Button type="button" variant="outline" onClick={() => onDaily(active)}>{daily}</Button>
    </div>
    {(events.get(active) ?? []).map(({ node, topic }) => <Button type="button" variant="outline" key={node.id}
      aria-pressed={selected === node.id} onClick={() => open(node.id)}><span>{node.title}</span><small>{topic}</small></Button>)}
    {!events.has(active) && <p>{labels.noEvents}</p>}
  </div>;
}

export function StudyDatabase({ rows, labels, selected, open, empty, locale }: RowProps & { locale: string }) {
  const [column, setColumn] = useState<"title" | "topic" | "folder" | "tags" | "date" | "status">("title");
  const [ascending, setAscending] = useState(true);
  const columns = ["title", "topic", "folder", "tags", "date", "status"] as const;
  const ordered = rows.map(row => ({ ...row, title: row.node.title })).sort((a, b) =>
    a[column].localeCompare(b[column], locale, { numeric: true }) * (ascending ? 1 : -1));
  return <div className="sb-study-rows">
    <h2>{labels.database}</h2>
    {ordered.length ? <div className="sb-study-table sb-study-db"><table aria-label={labels.database}>
      <thead><tr>{columns.map(key => <th key={key} scope="col" aria-sort={key === column ? ascending ? "ascending" : "descending" : "none"}>
        <Button type="button" variant="ghost" onClick={() => {
          if (key === column) setAscending(!ascending);
          else { setColumn(key); setAscending(true); }
        }}>{labels[key]}{key === column ? ascending ? " ↑" : " ↓" : ""}</Button>
      </th>)}</tr></thead>
      <tbody>{ordered.map(row => <tr key={row.node.id}>
        <th scope="row"><Button type="button" variant="ghost" aria-pressed={selected === row.node.id} onClick={() => open(row.node.id)}>{row.title}</Button></th>
        {columns.slice(1).map(key => <td key={key}>{row[key] || "—"}</td>)}
      </tr>)}</tbody>
    </table></div> : <p>{empty}</p>}
  </div>;
}

type FolderBranch = { children: Map<string, FolderBranch>; notes: WorkspaceRow[] };
export function StudyFiles({ rows, labels, selected, open, empty }: RowProps) {
  const root: FolderBranch = { children: new Map(), notes: [] };
  for (const row of rows) {
    let branch = root;
    for (const name of (row.folder || labels.noFolder).split("/").filter(Boolean)) {
      if (!branch.children.has(name)) branch.children.set(name, { children: new Map(), notes: [] });
      branch = branch.children.get(name)!;
    }
    branch.notes.push(row);
  }
  function renderBranch(branch: FolderBranch) {
    return <>
      {[...branch.children].sort(([a], [b]) => a.localeCompare(b)).map(([name, child]) => <details key={name} open>
        <summary><Folder size={16} />{name}</summary>{renderBranch(child)}
      </details>)}
      {branch.notes.map(({ node }) => <Button type="button" variant="ghost" key={node.id} onClick={() => open(node.id)}
        aria-pressed={selected === node.id}>{node.title}</Button>)}
    </>;
  }
  return <div className="sb-study-rows sb-study-filetree"><h2>{labels.files}</h2>{rows.length ? renderBranch(root) : <p>{empty}</p>}</div>;
}

export function StudyRoadmaps({ rows, labels, selected, open, empty }: RowProps) {
  const tracks = new Map<string, WorkspaceRow[]>();
  for (const row of rows) tracks.set(row.topic, [...(tracks.get(row.topic) ?? []), row]);
  return <div className="sb-study-rows">
    <h2>{labels.roadmap}</h2>
    {[...tracks].map(([topic, entries]) => {
      const tracked = entries.filter(({ node }) => node.done !== undefined);
      const done = tracked.filter(({ node }) => node.done).length;
      return <section className="sb-study-track" key={topic}>
        <h3>{topic}</h3>
        {tracked.length > 0 && <div><progress value={done} max={tracked.length} aria-label={topic} /> <small>{done} / {tracked.length}</small></div>}
        {entries.slice().sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999")).map(({ node, date, status }) =>
          <Button type="button" variant="outline" key={node.id} aria-pressed={selected === node.id} onClick={() => open(node.id)}>
            <span>{node.title}</span><small>{[date, status].filter(Boolean).join(" · ")}</small>
          </Button>)}
      </section>;
    })}
    {!rows.length && <p>{empty}</p>}
  </div>;
}

const focusSeconds = 25 * 60;
export function StudyFocusTimer({ labels }: { labels: Labels }) {
  const [remaining, setRemaining] = useState(focusSeconds);
  const [end, setEnd] = useState(0);
  useEffect(() => {
    if (!end) return;
    const interval = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(next);
      if (!next) setEnd(0);
    }, 200);
    return () => window.clearInterval(interval);
  }, [end]);

  function toggle() {
    if (end) {
      setRemaining(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
      setEnd(0);
    } else {
      const seconds = remaining || focusSeconds;
      setRemaining(seconds);
      setEnd(Date.now() + seconds * 1000);
    }
  }
  return <div className="sb-study-timer">
    <Timer size={16} aria-hidden />
    <span role="timer">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</span>
    <Button type="button" variant="ghost" aria-label={end ? labels.pause : labels.start} onClick={toggle}>
      {end ? <Pause size={16} /> : <Play size={16} />}
    </Button>
    {remaining !== focusSeconds && <Button type="button" variant="ghost" aria-label={labels.reset}
      onClick={() => { setEnd(0); setRemaining(focusSeconds); }}><RotateCcw size={16} /></Button>}
    {!remaining && <span role="status">{labels.finished}</span>}
  </div>;
}
