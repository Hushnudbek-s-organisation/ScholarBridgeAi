"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent } from "react";
import { useLocale } from "next-intl";
import dynamic from "next/dynamic";
import { ArrowRight, BookOpen, CalendarDays, ChevronLeft, ChevronRight, Download, Filter, FolderOpen, Layers, LockKeyhole, Maximize2, PanelRight, Type, Minus, Network, Plus, RotateCcw, Search, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeSwitch } from "@/components/ThemeToggle";
import { buildStudyGraph, parseStudyNote, serializeStudyNote, studyTags, STUDY_BODY_LIMIT, STUDY_COLORS, STUDY_GROUPS, STUDY_IMPORT_LIMIT, STUDY_LINK_LIMIT,
  type StudyEntry, type StudyGroup, type StudyMapSnapshot } from "@/lib/study-map";
import type { GraphCommand } from "./StudyGraph3D";
import { StudyMarkdown, StudySketch } from "./StudyNoteContent";
import {
  StudyCalendar, StudyDatabase, StudyFiles, StudyFocusTimer, StudyRoadmaps, studyTools, type WorkspaceRow,
} from "./StudyWorkspaceViews";
import "./study-map.css";

const words = {
  en: {
    folders: "Folders", allFolders: "All folders", tags: "Tags", allTags: "All tags", bookmarks: "Bookmarks",
    pin: "Pin", unpin: "Unpin", daily: "Daily note", import: "Import Markdown", export: "Export Markdown",
    editText: "Edit text", preview: "Preview", drawing: "Drawing", pen: "Pen", eraser: "Eraser",
    color: "Color", width: "Width", undo: "Undo", clear: "Clear", backlinks: "Backlinks",
    outgoing: "Outgoing links", createLinked: "Create linked note", local: "Local graph", global: "Whole graph", linkDepth: "Link depth",
    labels: "Labels", focusNode: "Focus on node", expand: "Expand graph", close: "Close graph", webgl: "WebGL is unavailable. The 2D graph is ready.",
    gesture: "Drag to orbit · Scroll or pinch to zoom · Select a node to open", tooLong: "Text and drawing exceed the note limit.", markdown: "Markdown supports [[note]], #tags and checklists.", saved: "Saved", folder: "Selected folder",
    untitled: "Untitled note",
    title: "Study map", description: "Your profile, plans and progress, connected in one place.",
    groups: ["Profile", "Skills & exams", "Universities", "Scholarships", "Applications & tasks", "Notes & cards"],
    views: ["Graph", "Mind map", "List", "Calendar", "Flashcards"], all: "All topics", filter: "Search your map", loading: "Loading your study map…",
    locked: "Unlock your study map with PRO", plan: "View PRO plan", error: "Could not load the map.", retry: "Retry", empty: "Nothing here yet.",
    note: "New note", card: "New flashcard", edit: "Edit", remove: "Delete", confirm: "Delete this entry?", cancel: "Cancel", save: "Save",
    name: "Title or question", content: "Note or answer", links: "Link to", open: "Open source", due: "Due for review", reveal: "Show answer",
    again: "Review again", remembered: "I remembered", noDue: "No cards due right now.", failed: "Could not save the change.",
    zoomIn: "Zoom in", zoomOut: "Zoom out", reset: "Reset view", rotate: "Rotate graph", done: "Completed", focus: "Selected topic",
    item: "Item", refreshed: "Refresh map", skill: "Learning tools", two: "2D", three: "3D",
  },
  uz: {
    folders: "Papkalar", allFolders: "Barcha papkalar", tags: "Teglar", allTags: "Barcha teglar", bookmarks: "Xatcho‘plar",
    pin: "Mahkamlash", unpin: "Ajratish", daily: "Kundalik qayd", import: "Markdown import", export: "Markdown eksport",
    editText: "Matnni yozish", preview: "Ko‘rinishi", drawing: "Chizma", pen: "Qalam", eraser: "O‘chirg‘ich",
    color: "Rang", width: "Qalinlik", undo: "Orqaga qaytarish", clear: "Tozalash", backlinks: "Kiruvchi havolalar",
    outgoing: "Chiquvchi havolalar", createLinked: "Bog‘langan qayd yaratish", local: "Mahalliy graf", global: "To‘liq graf", linkDepth: "Havola chuqurligi",
    labels: "Yorliqlar", focusNode: "Tugunga yaqinlashish", expand: "Grafni kengaytirish", close: "Grafni yopish", webgl: "WebGL ishlamadi. 2D graf tayyor.",
    gesture: "Sudrab buring · Aylantirib yoki chimchilab yaqinlashing · Tugunni bosib oching", tooLong: "Matn va chizma qayd hajmidan oshdi.", markdown: "Markdown [[qayd]], #teglar va vazifalar ro‘yxatini qo‘llaydi.", saved: "Saqlandi", folder: "Tanlangan papka",
    untitled: "Nomsiz qayd",
    title: "O‘quv xaritam", description: "Profil, rejalar va natijalaringiz bir joyda bog‘lanadi.",
    groups: ["Profil", "Ko‘nikma va imtihonlar", "Universitetlar", "Grantlar", "Ariza va vazifalar", "Qayd va kartalar"],
    views: ["Graf", "Aql xaritasi", "Ro‘yxat", "Taqvim", "Yodlash kartalari"], all: "Barcha mavzular", filter: "Xaritadan qidiring", loading: "O‘quv xaritasi yuklanmoqda…",
    locked: "O‘quv xaritasi PRO tarifida ochiladi", plan: "PRO tarifini ko‘rish", error: "Xarita yuklanmadi.", retry: "Qayta urinish", empty: "Bu yerda hali ma’lumot yo‘q.",
    note: "Yangi qayd", card: "Yangi yodlash kartasi", edit: "Tahrirlash", remove: "O‘chirish", confirm: "Shu yozuv o‘chirilsinmi?", cancel: "Bekor qilish", save: "Saqlash",
    name: "Sarlavha yoki savol", content: "Qayd yoki javob", links: "Bog‘lash", open: "Manbani ochish", due: "Takrorlash vaqti keldi", reveal: "Javobni ko‘rsatish",
    again: "Yana takrorlash", remembered: "Esladim", noDue: "Hozir takrorlanadigan karta yo‘q.", failed: "O‘zgarishni saqlab bo‘lmadi.",
    zoomIn: "Kattalashtirish", zoomOut: "Kichraytirish", reset: "Asl o‘lcham", rotate: "Grafni burish", done: "Bajarildi", focus: "Tanlangan mavzu",
    item: "Yozuv", refreshed: "Xaritani yangilash", skill: "O‘rganish vositalari", two: "2D", three: "3D",
  },
  ru: {
    folders: "Папки", allFolders: "Все папки", tags: "Теги", allTags: "Все теги", bookmarks: "Закладки",
    pin: "Закрепить", unpin: "Открепить", daily: "Ежедневная заметка", import: "Импорт Markdown", export: "Экспорт Markdown",
    editText: "Редактор", preview: "Просмотр", drawing: "Рисунок", pen: "Перо", eraser: "Ластик",
    color: "Цвет", width: "Толщина", undo: "Отменить", clear: "Очистить", backlinks: "Обратные ссылки",
    outgoing: "Исходящие ссылки", createLinked: "Создать связанную заметку", local: "Локальный граф", global: "Весь граф", linkDepth: "Глубина связей",
    labels: "Подписи", focusNode: "Приблизить узел", expand: "Развернуть граф", close: "Закрыть граф", webgl: "WebGL недоступен. Включён граф 2D.",
    gesture: "Перетаскивайте для вращения · Колесо или жест для масштаба · Выберите узел", tooLong: "Текст и рисунок превышают размер заметки.", markdown: "Markdown поддерживает [[заметки]], #теги и задачи.", saved: "Сохранено", folder: "Выбранная папка",
    untitled: "Заметка без названия",
    title: "Карта учёбы", description: "Профиль, планы и прогресс связаны в одном месте.",
    groups: ["Профиль", "Навыки и экзамены", "Университеты", "Стипендии", "Заявки и задачи", "Заметки и карточки"],
    views: ["Граф", "Карта мыслей", "Список", "Календарь", "Карточки"], all: "Все темы", filter: "Поиск по карте", loading: "Загружаем карту…",
    locked: "Карта учёбы доступна в PRO", plan: "Посмотреть тариф PRO", error: "Не удалось загрузить карту.", retry: "Повторить", empty: "Здесь пока ничего нет.",
    note: "Новая заметка", card: "Новая карточка", edit: "Править", remove: "Удалить", confirm: "Удалить эту запись?", cancel: "Отмена", save: "Сохранить",
    name: "Заголовок или вопрос", content: "Заметка или ответ", links: "Связать с", open: "Открыть источник", due: "Пора повторить", reveal: "Показать ответ",
    again: "Повторить позже", remembered: "Я вспомнил", noDue: "Сейчас нет карточек к повторению.", failed: "Не удалось сохранить изменения.",
    zoomIn: "Увеличить", zoomOut: "Уменьшить", reset: "Сбросить вид", rotate: "Повернуть граф", done: "Готово", focus: "Выбранная тема",
    item: "Запись", refreshed: "Обновить карту", skill: "Инструменты учёбы", two: "2D", three: "3D",
  },
};
const WebGLGraph = dynamic(() => import("./StudyGraph3D").then(module => module.StudyGraph3D), { ssr: false });

type Draft = Pick<StudyEntry, "kind" | "title" | "links"> & ReturnType<typeof parseStudyNote> & { id?: string };
const newDraft = (kind: Draft["kind"], folder = "", links: string[] = []): Draft =>
  ({ kind, title: "", links, body: "", folder, pinned: false, date: "", strokes: [] });
const fromEntry = (entry: StudyEntry): Draft => ({ ...entry, ...parseStudyNote(entry.text) });
const emptySnapshot: StudyMapSnapshot = { entries: [], nodes: [] };
const localDay = () => {
  const date = new Date();
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(value => String(value).padStart(2, "0")).join("-");
};
const anchors = [[390, 83], [652, 144], [650, 366], [390, 427], [129, 365], [129, 144]] as const;
const workspaceLabels = {
  en: { template: "Use a template", templates: ["Review a topic", "Plan an application", "Practice speaking"], updated: "Syncs with your profile while open", emptyResults: "No matching items", clear: "Clear filters", progress: "Completed", sourceConnected: "Connected items", due: "Cards due" },
  uz: { template: "Shablondan foydalanish", templates: ["Mavzuni takrorlash", "Arizani rejalash", "Speaking mashqi"], updated: "Ochiq turganda profilingiz bilan yangilanadi", emptyResults: "Mos yozuv topilmadi", clear: "Filtrlarni tozalash", progress: "Bajarilgan", sourceConnected: "Bog‘langan yozuvlar", due: "Takrorlanadigan kartalar" },
  ru: { template: "Использовать шаблон", templates: ["Повторить тему", "Спланировать заявку", "Практика речи"], updated: "Синхронизируется с профилем, пока открыта", emptyResults: "Ничего не найдено", clear: "Сбросить фильтры", progress: "Выполнено", sourceConnected: "Связанные записи", due: "Карточки к повторению" },
};
const templateNotes = {
  en: [
    "## What I learned\n\n## Questions to revisit\n- [ ] \n\n## Related notes\n",
    "## Goal\n\n## Requirements\n- [ ] Check the official programme page\n- [ ] Record the next deadline\n\n## Next action\n",
    "## Practice topic\n\n## Phrases to reuse\n\n## One thing to improve\n- [ ] Try the answer again\n",
  ],
  uz: [
    "## Nimani o‘rgandim?\n\n## Qayta ko‘riladigan savollar\n- [ ] \n\n## Bog‘langan qaydlar\n",
    "## Maqsad\n\n## Talablar\n- [ ] Dasturning rasmiy sahifasini tekshirish\n- [ ] Muddatni yozib olish\n\n## Keyingi qadam\n",
    "## Mashq mavzusi\n\n## Qayta ishlatiladigan iboralar\n\n## Yaxshilaydigan bir narsa\n- [ ] Javobni qayta aytish\n",
  ],
  ru: [
    "## Что я узнал\n\n## Вопросы для повторения\n- [ ] \n\n## Связанные заметки\n",
    "## Цель\n\n## Требования\n- [ ] Проверить страницу программы\n- [ ] Записать срок подачи\n\n## Следующий шаг\n",
    "## Тема практики\n\n## Полезные выражения\n\n## Что улучшить\n- [ ] Повторить ответ\n",
  ],
};

export function StudyMap({ onNavigate, onLock }: { onNavigate: (route: string) => void; onLock: () => void }) {
  const locale = useLocale();
  const language = locale === "uz" || locale === "ru" ? locale : "en";
  const t = words[language];
  const workspace = workspaceLabels[language];
  const tools = studyTools[language];
  const [snapshot, setSnapshot] = useState<StudyMapSnapshot | null>(null);
  const [status, setStatus] = useState("loading");
  const [refresh, setRefresh] = useState(0);
  const [history, setHistory] = useState({ ids: [""], index: 0 });
  const selected = history.ids[history.index];
  const [details, setDetails] = useState(true);
  const [largeText, setLargeText] = useState(false);
  const [topic, setTopic] = useState<StudyGroup | "all">("all");
  const [view, setView] = useState(0);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [depth, setDepth] = useState(true);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [local, setLocal] = useState(false);
  const [linkDepth, setLinkDepth] = useState(1);
  const [labels, setLabels] = useState(true);
  const [command, setCommand] = useState<GraphCommand | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [folder, setFolder] = useState("");
  const [tag, setTag] = useState("");
  const [bookmarks, setBookmarks] = useState(false);
  const [editorTab, setEditorTab] = useState<"text" | "preview" | "drawing">("text");
  const importFile = useRef<HTMLInputElement>(null);
  const importFolder = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const editorTitle = useRef<HTMLInputElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const graphWindow = useRef<HTMLDivElement>(null);
  const graphClose = useRef<HTMLButtonElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ pointer: number; x: number; y: number; pan: typeof pan; scale: number } | null>(null);
  const receivedAt = useRef(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [revealed, reveal] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/study-map", { cache: "no-store", signal: controller.signal }).then(async result => {
      if (controller.signal.aborted) return;
      if (!result.ok) {
        setStatus(result.status === 403 ? "locked" : "error");
        setSnapshot(null);
        return;
      }
      const next = await result.json() as StudyMapSnapshot;
      if (!controller.signal.aborted) {
        setSnapshot(next);
        setStatus("ready");
        receivedAt.current = Date.now();
        setNow(receivedAt.current);
      }
    }).catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (status !== "ready") return;
    const synchronize = () => {
      if (Date.now() - receivedAt.current > 60_000) setRefresh(value => value + 1);
    };
    window.addEventListener("focus", synchronize);
    const timer = window.setInterval(() => { if (!document.hidden) synchronize(); }, 65_000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", synchronize);
    };
  }, [status]);

  useEffect(() => {
    if (!expanded) return;
    const trigger = expandButton.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    graphClose.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
      if (event.key !== "Tab" || !graphWindow.current) return;
      const elements = [...graphWindow.current.querySelectorAll<HTMLElement>("button:not([disabled]), select")]
        .filter(element => !element.hidden && element.getClientRects().length > 0);
      if (event.shiftKey && document.activeElement === elements[0]) {
        event.preventDefault(); elements.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === elements.at(-1)) {
        event.preventDefault(); elements[0]?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", key);
      if (trigger?.isConnected) requestAnimationFrame(() => trigger.focus());
    };
  }, [expanded]);

  useEffect(() => {
    function search(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k" || !searchInput.current || expanded) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      searchInput.current.focus();
      searchInput.current.select();
    }
    window.addEventListener("keydown", search, true);
    return () => window.removeEventListener("keydown", search, true);
  }, [expanded]);

  const { nodes, notes, edges, resolve } = useMemo(() => buildStudyGraph(snapshot ?? emptySnapshot), [snapshot]);
  const byId = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes]);
  const tagsById = useMemo(() => new Map([...notes].map(([id, note]) => [id, studyTags(note.body, note.metadata)])), [notes]);
  const folders = useMemo(() => [...new Set([...notes.values()].map(note => note.folder).filter(Boolean))].sort(), [notes]);
  const tags = useMemo(() => [...new Set([...tagsById.values()].flat())].sort(), [tagsById]);
  const groupName = (group: StudyGroup) => t.groups[STUDY_GROUPS.indexOf(group)];
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(locale);
    return nodes.filter(node => {
      const note = notes.get(node.id);
      return (topic === "all" || node.group === topic) && (!folder || note?.folder === folder || note?.folder.startsWith(folder + "/"))
        && (!tag || tagsById.get(node.id)?.includes(tag)) && (!bookmarks || note?.pinned)
        && `${node.title} ${node.detail ?? ""} ${t.groups[STUDY_GROUPS.indexOf(node.group)]} ${note?.folder ?? ""}`.toLocaleLowerCase(locale).includes(q);
    });
  }, [bookmarks, folder, locale, nodes, notes, query, tag, tagsById, topic, t.groups]);
  const visibleIds = useMemo(() => new Set(filtered.map(node => node.id)), [filtered]);
  const graphNodes = useMemo(() => {
    if (!local || !selected || !visibleIds.has(selected)) return filtered;
    const near = new Set([selected]);
    for (let depthIndex = 0; depthIndex < linkDepth; depthIndex++) {
      const next = edges.flatMap(({ from, to }) => near.has(from) ? [to] : near.has(to) ? [from] : []);
      next.filter(id => visibleIds.has(id)).forEach(id => near.add(id));
    }
    return filtered.filter(node => near.has(node.id));
  }, [edges, filtered, linkDepth, local, selected, visibleIds]);
  const graphEdges = useMemo(() => {
    const ids = new Set(graphNodes.map(node => node.id));
    return edges.filter(({ from, to }) => ids.has(from) && ids.has(to));
  }, [edges, graphNodes]);
  const active = byId.get(selected);
  const activeEntry = snapshot?.entries.find(entry => entry.id === selected);
  const activeNote = activeEntry && notes.get(activeEntry.id);
  const outgoing = edges.filter(edge => edge.from === selected).flatMap(({ to }) => byId.get(to) ?? []);
  const incoming = edges.filter(edge => edge.to === selected).flatMap(({ from }) => byId.get(from) ?? []);
  const dueCards = snapshot?.entries.filter(entry => entry.kind === "card" && new Date(entry.dueAt).getTime() <= now && visibleIds.has(entry.id)) ?? [];
  const completed = nodes.filter(node => node.done).length;
  const hasFilters = query || topic !== "all" || folder || tag || bookmarks;
  const rows: WorkspaceRow[] = view < 3 || view === 4 || view === 8 ? [] : filtered.map(node => ({
    node, topic: groupName(node.group), folder: notes.get(node.id)?.folder ?? "",
    tags: tagsById.get(node.id)?.map(tag => `#${tag}`).join(" ") ?? "",
    date: node.date || notes.get(node.id)?.date || "",
    status: node.done === undefined ? "" : node.done ? t.done : tools.pending,
  }));
  const viewProps = { rows, labels: tools, selected, open: selectNode, empty: t.empty };

  function selectNode(id: string) {
    setDetails(true);
    setHistory(value => {
      if (value.ids[value.index] === id) return value;
      const ids = [...value.ids.slice(0, value.index + 1), id].slice(-60);
      return { ids, index: ids.length - 1 };
    });
  }

  function stepHistory(delta: number) {
    const next = history.index + delta;
    if (next < 0 || next >= history.ids.length) return;
    setDetails(true);
    setHistory({ ...history, index: next });
    if (depth && byId.has(history.ids[next])) setCommand({ action: "focus", id: history.ids[next] });
  }

  function clearFilters() {
    setQuery(""); setTopic("all"); setFolder(""); setTag(""); setBookmarks(false);
  }

  function editDraft(value: Draft, tab: typeof editorTab = "text") {
    setDetails(true);
    setDraft(value);
    setEditorTab(tab);
    setNotice("");
    requestAnimationFrame(() => editorTitle.current?.focus());
  }

  function chooseGraphNode(id: string) {
    if (id.startsWith("group:")) {
      const group = id.slice(6) as StudyGroup;
      setTopic(value => value === group ? "all" : group);
      return;
    }
    selectNode(id);
  }

  function exportEntry(entry: StudyEntry) {
    const wikilinks = (entry.links ?? []).flatMap(id => {
      const linked = byId.get(id);
      if (!linked) return [];
      const folderName = notes.get(id)?.folder;
      const target = folderName ? `${folderName}/${linked.title}` : linked.title;
      return target.includes("]]") ? [] : [`[[${target}]]`];
    });
    const note = parseStudyNote(entry.text);
    const prefix = note.body.startsWith("# ") ? "" : `# ${entry.title}\n\n`;
    const body = [prefix + note.body, wikilinks.join("\n")].filter(Boolean).join("\n\n");
    const blob = new Blob([serializeStudyNote({ ...note, body })], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entry.title.replace(/[^\p{L}\p{N} ._-]+/gu, "-").slice(0, 100) || "note"}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importNote(file: File) {
    if (!/\.(?:md|markdown|txt)$/i.test(file.name)) return;
    if (file.size > STUDY_BODY_LIMIT * 4) { setNotice(t.tooLong); return; }
    try {
      const text = await file.text();
      if (text.length > STUDY_BODY_LIMIT) { setNotice(t.tooLong); return; }
      const source = parseStudyNote(text);
      const title = file.name.replace(/\.(?:md|markdown|txt)$/i, "").trim() || t.untitled;
      editDraft({ ...newDraft("note", folder), ...source, folder: source.folder || folder, title: title.slice(0, 120) });
    } catch { setNotice(t.failed); }
  }

  async function importNotes(files: File[], fromFolder: boolean) {
    const notes = files.filter(file => /\.(?:md|markdown|txt)$/i.test(file.name));
    if (!notes.length) { setNotice(tools.noFiles); return; }
    if (notes.length > STUDY_IMPORT_LIMIT) { setNotice(tools.importLimit); return; }
    if (notes.length === 1 && !fromFolder) { await importNote(notes[0]); return; }
    if (notes.some(file => file.size > STUDY_BODY_LIMIT * 4)) { setNotice(t.tooLong); return; }
    try {
      const items = await Promise.all(notes.map(async file => {
        const raw = await file.text();
        const source = parseStudyNote(raw);
        // Keep paths relative to the chosen vault so imported [[folder/title]] links still resolve.
        const path = file.webkitRelativePath.split("/").slice(1, -1).join("/");
        const title = file.name.replace(/\.(?:md|markdown|txt)$/i, "").trim() || t.untitled;
        return { kind: "note", title: title.slice(0, 120), links: [],
          text: serializeStudyNote({ ...source, folder: source.folder || path || folder, body: source.body || `# ${title}` }) };
      }));
      if (items.some(item => item.text.length > STUDY_BODY_LIMIT)) { setNotice(t.tooLong); return; }
      await mutate({ action: "import", items }, false);
      setView(7);
    } catch { setNotice(t.failed); }
  }

  async function mutate(payload: object, closeEditor = true) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/study-map", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (response.status === 403) {
        setStatus("locked");
        setSnapshot(null);
        return;
      }
      if (response.status === 409) { setNotice(tools.limit); return; }
      if (response.status === 413) { setNotice(tools.payloadLimit); return; }
      if (!response.ok) throw new Error();
      const result = await response.json() as { id?: string };
      if (result.id) selectNode(result.id);
      if (closeEditor) setDraft(null);
      setDeleteId("");
      reveal("");
      setRefresh(value => value + 1);
      setNotice(t.saved);
    } catch { setNotice(t.failed); }
    finally { setBusy(false); }
  }

  function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft) saveDraft(draft);
  }

  function saveDraft(value: Draft, closeEditor = true) {
    const text = serializeStudyNote(value);
    if (text.length > STUDY_BODY_LIMIT) { setNotice(t.tooLong); return; }
    void mutate({ id: value.id, kind: value.kind, title: value.title, text, links: value.links, action: "save" }, closeEditor);
  }

  function toggleTask(line: number) {
    if (!activeEntry || busy) return;
    const value = fromEntry(activeEntry);
    const lines = value.body.split(/\r?\n/);
    lines[line] = lines[line]?.replace(/^(\s*(?:[-*+]|\d+\.) )\[([ xX])\]/, (_, list, mark) => `${list}[${mark === " " ? "x" : " "}]`) ?? "";
    saveDraft({ ...value, body: lines.join("\n") }, false);
  }

  function beginGraphDrag(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || drag.current || (event.target as Element).closest(".sb-study-node")) return;
    const { width } = event.currentTarget.getBoundingClientRect();
    if (width === 0) return;
    drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, pan, scale: 780 / width };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function moveGraph(event: PointerEvent<SVGSVGElement>) {
    const grab = drag.current;
    if (!grab || grab.pointer !== event.pointerId) return;
    const x = (event.clientX - grab.x) * grab.scale;
    const y = (event.clientY - grab.y) * grab.scale;
    setPan({ x: Math.max(-480, Math.min(480, grab.pan.x + x)), y: Math.max(-340, Math.min(340, grab.pan.y + y)) });
  }

  function endGraphDrag(event: PointerEvent<SVGSVGElement>) {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
  }

  function graph() {
    const filterActive = topic !== "all" || Boolean(query.trim() || folder || tag || bookmarks || local);
    const plotted = STUDY_GROUPS.flatMap((group, i) => {
      const kids = graphNodes.filter(node => node.group === group);
      if (filterActive && kids.length === 0) return [];
      const [x, y] = anchors[i];
      return [{ group, i, x, y, kids }];
    });
    const points = new Map(plotted.flatMap(({ x, y, kids }) => kids.map((node, i) => {
      const angle = i * Math.PI * 2 / Math.max(3, kids.length) + .45;
      const radius = 34 + (i % 5) * 8;
      return [node.id, { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius }] as const;
    })));
    const paths = graphEdges.flatMap(({ from, to }) => {
      const start = points.get(from);
      const end = points.get(to);
      return start && end ? [{ id: `${from}:${to}`, from: start, to: end }] : [];
    });
    return <svg viewBox="0 0 780 510" aria-label={t.title} className="sb-study-map-svg" data-dragging={dragging || undefined}
      onPointerDown={beginGraphDrag} onPointerMove={moveGraph} onLostPointerCapture={endGraphDrag}>
      <g transform={`translate(${390 + pan.x} ${255 + pan.y}) scale(${zoom}) translate(-390 -255)`}>
        {plotted.map(({ group, i, x, y, kids }) => {
          const point = { x, y };
          return <g key={group}>
            <path d={`M390 255 Q${(point.x + 390) / 2} ${point.y} ${point.x} ${point.y}`} stroke={STUDY_COLORS[i]} opacity=".43" fill="none"/>
            {kids.map(node => {
              const child = points.get(node.id)!;
              return <line key={node.id} x1={point.x} y1={point.y} x2={child.x} y2={child.y} stroke={STUDY_COLORS[i]} opacity=".45"/>;
            })}
          </g>;
        })}
        {paths.map(edge => <line key={edge.id} x1={edge.from.x} y1={edge.from.y} x2={edge.to.x} y2={edge.to.y} stroke="currentColor" opacity=".24"/>)}
        <circle cx="390" cy="255" r="20" className="sb-study-root"/><circle cx="390" cy="255" r="6" fill="currentColor"/>
        {plotted.map(({ group, i, x, y, kids }) => {
          const point = { x, y };
          return <g key={group}>
            {kids.map(node => {
              const p = points.get(node.id)!;
              return <g key={node.id} role="button" tabIndex={0} aria-label={node.title} className="sb-study-node"
                onClick={() => selectNode(node.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectNode(node.id); } }}>
                <circle cx={p.x} cy={p.y} r="13" fill="transparent"/><circle cx={p.x} cy={p.y} r={selected === node.id ? 9 : 5.5} fill={STUDY_COLORS[i]}/>
                <title>{node.title}</title>
              </g>;
            })}
            <g role="button" tabIndex={0} aria-label={groupName(group)} className="sb-study-node"
              onClick={() => setTopic(topic === group ? "all" : group)}
              onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setTopic(topic === group ? "all" : group); } }}>
              <circle cx={point.x} cy={point.y} r="23" fill={STUDY_COLORS[i]} opacity=".18"/>
              <circle cx={point.x} cy={point.y} r="12" fill={STUDY_COLORS[i]}/>
              <text x={point.x} y={point.y + 72} textAnchor="middle">{groupName(group)}</text>
            </g>
          </g>;
        })}
      </g>
    </svg>;
  }

  if (status === "locked") return <section className="sb-study-map-gate">
    <LockKeyhole size={28} aria-hidden /><h1>{t.locked}</h1><p>{t.description}</p>
    <Button type="button" onClick={() => onNavigate("payments")}>{t.plan}<ArrowRight size={16} aria-hidden /></Button>
  </section>;
  if (!snapshot || status === "error") return <section className="sb-study-map-gate">
    <h1>{t.title}</h1><p role="status">{status === "error" ? t.error : t.loading}</p>
    {status === "error" && <Button type="button" onClick={() => setRefresh(value => value + 1)}>{t.retry}</Button>}
  </section>;

  return <section className="sb-study-map" aria-label={t.title}>
    <header className="sb-study-heading">
      <div><h1><Network size={25} aria-hidden /> {t.title} <span className="sb-study-pro">PRO</span></h1><p>{t.description}</p></div>
      <div className="sb-study-actions">
        <Button type="button" variant="outline" onClick={() => setRefresh(value => value + 1)} aria-label={t.refreshed}><RotateCcw size={16} aria-hidden /></Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void mutate({ action: "daily", day: localDay() })}><CalendarDays size={16} aria-hidden />{t.daily}</Button>
        <Button type="button" variant="outline" onClick={() => importFile.current?.click()}><Upload size={16} aria-hidden />{t.import}</Button>
        <input ref={importFile} hidden type="file" multiple accept=".md,.markdown,.txt" onChange={event => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) void importNotes(files, false);
        }} />
        <Button type="button" variant="outline" onClick={() => editDraft(newDraft("card", folder))}><Layers size={16} aria-hidden />{t.card}</Button>
        <label className="sb-study-template"><select aria-label={workspace.template} value="" onChange={event => {
          if (!event.target.value) return;
          const index = Number(event.target.value);
          editDraft({ ...newDraft("note", folder), title: workspace.templates[index], body: templateNotes[language][index] });
        }}>
          <option value="">{workspace.template}</option>
          {workspace.templates.map((title, index) => <option value={index} key={title}>{title}</option>)}
        </select></label>
        <Button type="button" onClick={() => editDraft(newDraft("note", folder))}><Plus size={16} aria-hidden />{t.note}</Button>
      </div>
    </header>
    <div className="sb-study-status">
      <span>{nodes.length} {workspace.sourceConnected}</span><span>{completed} {workspace.progress}</span>
      <span>{dueCards.length} {workspace.due}</span><span>{workspace.updated}</span>
    </div>
    <div className="sb-study-layout" data-details={details || undefined}>
      <aside className="sb-study-panel sb-study-sidebar">
        <div className="sb-study-filter sb-study-search">
          <label><Search size={16} aria-hidden /><input ref={searchInput} type="search" aria-label={t.filter} placeholder={tools.search}
            aria-keyshortcuts="Control+K Meta+K" value={query} onChange={event => setQuery(event.target.value)} /><kbd>⌘K</kbd></label>
        </div>
        <nav className="sb-study-views" aria-label={t.title}>
          {[0, 1, 5, 3, 6, 4, 7, 2, 8].map(index => {
            const label = [...t.views, tools.database, tools.roadmap, tools.files, tools.trash][index];
            return <Button key={label} variant="unstyled" type="button" aria-pressed={index === view}
              onClick={() => { setView(index); setExpanded(false); }}>{label}
              {index === 8 && Boolean(snapshot.trash?.length) && <small>{snapshot.trash?.length}</small>}</Button>;
          })}
        </nav>
        <div className="sb-study-filter">
          <label><Filter size={16} aria-hidden /><select aria-label={t.all} value={topic} onChange={event => setTopic(event.target.value as StudyGroup | "all")}>
            <option value="all">{t.all}</option>
            {STUDY_GROUPS.map(group => <option value={group} key={group}>{groupName(group)}</option>)}
          </select></label>
        </div>
        <div className="sb-study-filter sb-study-extra">
          <label><FolderOpen size={16} aria-hidden /><select aria-label={t.folders} value={folder} onChange={event => setFolder(event.target.value)}>
            <option value="">{t.allFolders}</option>{folders.map(value => <option key={value}>{value}</option>)}
          </select></label>
          <label><select aria-label={t.tags} value={tag} onChange={event => setTag(event.target.value)}>
            <option value="">{t.allTags}</option>{tags.map(value => <option value={value} key={value}>#{value}</option>)}
          </select></label>
          <Button type="button" variant="outline" aria-pressed={bookmarks} onClick={() => setBookmarks(value => !value)}><Star size={15} aria-hidden />{t.bookmarks}</Button>
          {hasFilters && <Button type="button" variant="ghost" onClick={clearFilters}>{workspace.clear}</Button>}
        </div>
        <div className="sb-study-sidebar-actions">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => importFolder.current?.click()}><Upload size={15} aria-hidden />{tools.importFolder}</Button>
          <input ref={element => { importFolder.current = element; element?.setAttribute("webkitdirectory", ""); }}
            hidden type="file" multiple onChange={event => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (files.length) void importNotes(files, true);
            }} />
          <Button type="button" variant="ghost" onClick={() => { if (window.confirm(tools.lockConfirm)) onLock(); }}><LockKeyhole size={15} aria-hidden />{tools.lock}</Button>
        </div>
      </aside>
      <div className="sb-study-panel sb-study-main">
        <div className="sb-study-toolbar">
          <div className="sb-study-actions">
            <Button type="button" variant="ghost" aria-label={tools.back} disabled={!history.index} onClick={() => stepHistory(-1)}><ChevronLeft size={17} /></Button>
            <Button type="button" variant="ghost" aria-label={tools.forward} disabled={history.index >= history.ids.length - 1} onClick={() => stepHistory(1)}><ChevronRight size={17} /></Button>
            <Button type="button" variant="ghost" aria-label={details ? tools.hideDetails : tools.showDetails} aria-pressed={details}
              onClick={() => setDetails(value => !value)}><PanelRight size={17} /></Button>
            <Button type="button" variant="ghost" aria-label={tools.textSize} aria-pressed={largeText} onClick={() => setLargeText(value => !value)}><Type size={17} /></Button>
            <ThemeSwitch />
          </div>
          <StudyFocusTimer labels={tools} />
        </div>
        <div className="sb-study-counts"><span>{snapshot.entries.filter(entry => entry.kind === "note").length} {tools.notes}</span><span>{graphEdges.length} {tools.links}</span></div>
        {notice && <p className="sb-study-feedback" role={notice === t.saved ? "status" : "alert"}>{notice}</p>}
        {hasFilters && !filtered.length && view !== 8 && <p className="sb-study-no-results" role="status">{workspace.emptyResults}</p>}
        {view === 0 && <>
          <div ref={graphWindow} className="sb-study-graph-window" data-expanded={expanded || undefined}
            role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} aria-label={expanded ? t.views[0] : undefined}>
            <div className="sb-study-canvas">
              {depth ? <WebGLGraph nodes={graphNodes} edges={graphEdges} groupLabels={t.groups} selected={selected}
                labels={labels} command={command} onSelect={chooseGraphNode} onUnavailable={() => { setDepth(false); setWebglUnavailable(true); }} /> : graph()}
              {depth && <p className="sb-study-graph-tip">{t.gesture}</p>}
            </div>
            <div className="sb-study-tools">
              <Button type="button" variant={depth ? "outline" : "primary"} aria-pressed={!depth} onClick={() => setDepth(false)}>{t.two}</Button>
              <Button type="button" variant={depth ? "primary" : "outline"} disabled={webglUnavailable} aria-pressed={depth} onClick={() => { setDepth(true); setCommand(null); }}>{t.three}</Button>
              {depth && <>
                <Button type="button" variant="outline" aria-label={t.rotate} onClick={() => setCommand({ action: "rotate" })}><RotateCcw size={17} aria-hidden /></Button>
                <Button type="button" variant="outline" aria-pressed={labels} onClick={() => setLabels(value => !value)}>{t.labels}</Button>
                <Button type="button" variant="outline" disabled={!selected} onClick={() => setCommand({ action: "focus", id: selected })}>{t.focusNode}</Button>
              </>}
              <Button type="button" variant="outline" disabled={!selected && !local} aria-pressed={local} onClick={() => setLocal(value => !value)}>{local ? t.global : t.local}</Button>
              {local && <label>{t.linkDepth} <select value={linkDepth} onChange={event => setLinkDepth(Number(event.target.value))}>
                {[1, 2, 3].map(value => <option key={value}>{value}</option>)}
              </select></label>}
              <Button type="button" variant="outline" aria-label={t.zoomOut} onClick={() => depth ? setCommand({ action: "zoom-out" }) : setZoom(value => Math.max(.7, value - .15))}><Minus size={17} aria-hidden /></Button>
              <Button type="button" variant="outline" aria-label={t.reset} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setCommand({ action: "reset" }); }}><RotateCcw size={16} aria-hidden /></Button>
              <Button type="button" variant="outline" aria-label={t.zoomIn} onClick={() => depth ? setCommand({ action: "zoom-in" }) : setZoom(value => Math.min(1.8, value + .15))}><Plus size={17} aria-hidden /></Button>
              {expanded && <Button ref={graphClose} type="button" variant="outline" onClick={() => setExpanded(false)}>{t.close}</Button>}
              <Button hidden={expanded} ref={expandButton} type="button" variant="outline" aria-label={t.expand} onClick={() => setExpanded(true)}><Maximize2 size={17} aria-hidden /></Button>
            </div>
          </div>
          {webglUnavailable && <p className="sb-study-empty" role="status">{t.webgl}</p>}
          {filtered.length === 0 && <p className="sb-study-empty">{t.empty}</p>}
          {query.trim() && filtered.length > 0 && <div className="sb-study-rows">{filtered.map(node =>
            <Button key={node.id} variant="outline" type="button" onClick={() => { selectNode(node.id); setCommand({ action: "focus", id: node.id }); }}>{node.title}</Button>)}</div>}
        </>}
        {view === 1 && <div className="sb-study-mind"><div className="sb-study-mind-root">{t.title}</div>
          {STUDY_GROUPS.map((group, i) => {
            const items = filtered.filter(node => node.group === group);
            return items.length ? <details key={group} open className="sb-study-mind-topic" style={{ "--node-color": STUDY_COLORS[i] } as CSSProperties}>
              <summary>{groupName(group)} <small>{items.length}</small></summary>
              <div>{items.map(node => {
                const related = edges.flatMap(({ from, to }) => from === node.id ? [to] : to === node.id ? [from] : []);
                const adjacent = [...new Set(related)].filter(id => visibleIds.has(id));
                return <div className="sb-study-mind-item" key={node.id}>
                  <Button type="button" variant="outline" aria-pressed={selected === node.id} onClick={() => selectNode(node.id)}>{node.title}</Button>
                  {adjacent.length > 0 && <details className="sb-study-mind-branch">
                    <summary>{t.links} <small>{adjacent.length}</small></summary>
                    <div>{adjacent.map(id => <Button key={id} type="button" variant="outline" onClick={() => selectNode(id)}>{byId.get(id)?.title}</Button>)}</div>
                  </details>}
                </div>;
              })}</div>
            </details> : null;
          })}
          {!filtered.length && <p className="sb-study-empty">{t.empty}</p>}
        </div>}
        {view === 2 && <div className="sb-study-rows">
          {filtered.map(node => <Button variant="outline" key={node.id} type="button" aria-pressed={selected === node.id}
            onClick={() => selectNode(node.id)}><span>{node.title}</span><small>{node.date || groupName(node.group)}</small></Button>)}
          {!filtered.length && <p>{t.empty}</p>}
        </div>}
        {view === 3 && <StudyCalendar {...viewProps} locale={locale} daily={t.daily}
          onDaily={day => void mutate({ action: "daily", day })} />}
        {view === 5 && <StudyDatabase {...viewProps} locale={locale} />}
        {view === 6 && <StudyRoadmaps {...viewProps} rows={rows.filter(({ node }) =>
          /^(plan|lesson|exam|task|app):/.test(node.id))} />}
        {view === 7 && <StudyFiles {...viewProps} rows={rows.filter(({ node }) => notes.has(node.id))} />}
        {view === 8 && <div className="sb-study-rows">
          <h2>{tools.trash}</h2>
          {!snapshot.trash?.length && <p>{t.empty}</p>}
          {snapshot.trash?.map(entry => <article className="sb-study-card" key={entry.id}>
            <strong>{entry.title}</strong>
            <div className="sb-study-actions">
              <Button type="button" variant="outline" disabled={busy} onClick={() => void mutate({ action: "restore", id: entry.id }, false)}>{tools.restore}</Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => {
                if (window.confirm(tools.purgeConfirm)) void mutate({ action: "purge", id: entry.id }, false);
              }}><Trash2 size={15} aria-hidden />{tools.purge}</Button>
            </div>
          </article>)}
        </div>}
        {view === 4 && <div className="sb-study-rows">
          <p>{dueCards.length ? t.due : t.noDue}</p>
          {dueCards.map(entry => <article key={entry.id} className="sb-study-card">
            <strong>{entry.title}</strong>
            {revealed === entry.id ? <><p>{notes.get(entry.id)?.body}</p><div className="sb-study-actions">
              <Button type="button" variant="outline" disabled={busy} onClick={() => void mutate({ action: "review", id: entry.id, remembered: false })}>{t.again}</Button>
              <Button type="button" disabled={busy} onClick={() => void mutate({ action: "review", id: entry.id, remembered: true })}>{t.remembered}</Button>
            </div></> : <Button type="button" variant="outline" onClick={() => reveal(entry.id)}>{t.reveal}</Button>}
          </article>)}
        </div>}
      </div>
      <aside className="sb-study-panel sb-study-detail" hidden={!details} data-large={largeText || undefined}>
        <h2><BookOpen size={19} aria-hidden />{active?.title || t.focus}</h2>
        {active ? <>
          <small>{groupName(active.group)}{active.done ? ` · ${t.done}` : ""}{active.date ? ` · ${active.date}` : ""}</small>
          {activeNote?.folder && <Button type="button" variant="ghost" onClick={() => { setFolder(activeNote.folder); setView(2); }}><FolderOpen size={15} />{activeNote.folder}</Button>}
          {activeNote && activeEntry?.kind === "note" ? <>
            <StudyMarkdown body={activeNote.body} resolve={resolve} open={selectNode} toggleTask={busy || draft ? undefined : toggleTask} taskLabel={t.item} />
            {activeNote.strokes.length > 0 && <StudySketch key={activeEntry.id} strokes={activeNote.strokes} labels={t} />}
            {(tagsById.get(activeEntry.id) ?? []).length > 0 && <div className="sb-study-tags">
              {tagsById.get(activeEntry.id)?.map(name => <Button key={name} type="button" variant="ghost" onClick={() => { setTag(name); setView(2); }}>#{name}</Button>)}
            </div>}
          </> : (activeNote?.body || active.detail) && <p>{activeNote?.body || active.detail}</p>}
          {active.route && <Button type="button" variant="outline" onClick={() => onNavigate(active.route!)}>{t.open}<ArrowRight size={16} aria-hidden /></Button>}
          {activeEntry && activeNote && <div className="sb-study-actions">
            <Button type="button" variant="outline" onClick={() => editDraft(fromEntry(activeEntry))}>{t.edit}</Button>
            <Button type="button" variant="outline" disabled={busy || Boolean(draft)} aria-pressed={activeNote.pinned}
              onClick={() => saveDraft({ ...fromEntry(activeEntry), pinned: !activeNote.pinned }, false)}><Star size={15} />{activeNote.pinned ? t.unpin : t.pin}</Button>
            <Button type="button" variant="outline" onClick={() => exportEntry(activeEntry)}><Download size={15} />{t.export}</Button>
            {deleteId !== activeEntry.id ? <Button type="button" variant="ghost" onClick={() => setDeleteId(activeEntry.id)}>{t.remove}</Button> :
            <><Button type="button" variant="danger" disabled={busy} onClick={() => void mutate({ action: "delete", id: activeEntry.id })}>{t.confirm}</Button><Button type="button" variant="ghost" onClick={() => setDeleteId("")}>{t.cancel}</Button></>}
          </div>}
          <Button type="button" variant="ghost" onClick={() => editDraft(newDraft("note", activeNote?.folder || folder, [active.id]))}><Plus size={16} />{t.createLinked}</Button>
          {([[t.outgoing, outgoing], [t.backlinks, incoming]] as const).map(([title, group]) => group.length > 0 && <section className="sb-study-links" key={title}>
            <h3>{title}</h3>
            {group.map(node => <Button type="button" variant="outline" key={node.id} onClick={() => selectNode(node.id)}>{node.title}</Button>)}
          </section>)}
        </> : STUDY_GROUPS.map(group => <Button type="button" variant="outline" key={group} onClick={() => { setTopic(group); setView(2); }}>
          {groupName(group)} <small>{nodes.filter(node => node.group === group).length}</small>
        </Button>)}
        {draft && <form className="sb-study-editor" onSubmit={saveEntry}>
          <h3>{draft.kind === "note" ? t.note : t.card}</h3>
          <label>{t.name}<input ref={editorTitle} required maxLength={120} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })}/></label>
          {draft.kind === "note" && <>
            <label>{t.folder}<input maxLength={80} list="study-note-folders" value={draft.folder} onChange={event => setDraft({ ...draft, folder: event.target.value })} /></label>
            <label>{tools.date}<input type="date" value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} /></label>
            <datalist id="study-note-folders">{folders.map(value => <option key={value}>{value}</option>)}</datalist>
            <div className="sb-study-actions">
              <Button type="button" variant="outline" aria-pressed={editorTab === "text"} onClick={() => setEditorTab("text")}>{t.editText}</Button>
              <Button type="button" variant="outline" aria-pressed={editorTab === "preview"} onClick={() => setEditorTab("preview")}>{t.preview}</Button>
              <Button type="button" variant="outline" aria-pressed={editorTab === "drawing"} onClick={() => setEditorTab("drawing")}>{t.drawing}</Button>
            </div>
          </>}
          {(draft.kind === "card" || editorTab === "text") && <label>{t.content}<textarea required={!draft.strokes.length} maxLength={STUDY_BODY_LIMIT} rows={6}
            value={draft.body} onChange={event => setDraft({ ...draft, body: event.target.value })} /></label>}
          {draft.kind === "note" && editorTab === "text" && <small>{t.markdown}</small>}
          {editorTab === "preview" && <StudyMarkdown body={draft.body} resolve={resolve} open={selectNode} taskLabel={t.item} />}
          {editorTab === "drawing" && <StudySketch key={draft.id || "new"} strokes={draft.strokes} labels={t}
            change={strokes => setDraft(previous => previous && { ...previous, strokes })} />}
          {nodes.length > 0 && <label>{t.links}<select value="" onChange={event => {
            const value = event.target.value;
            if (value && draft.links.length < STUDY_LINK_LIMIT && !draft.links.includes(value)) setDraft({ ...draft, links: [...draft.links, value] });
          }}><option value="">{t.item}</option>{nodes.filter(node => node.id !== draft.id && !draft.links.includes(node.id)).map(node =>
            <option key={node.id} value={node.id}>{notes.get(node.id)?.folder ? `${notes.get(node.id)?.folder}/` : ""}{node.title}</option>)}</select></label>}
          {draft.links.map(id => <Button key={id} type="button" variant="outline" onClick={() => setDraft({ ...draft, links: draft.links.filter(link => link !== id) })}>
            {byId.get(id)?.title || id} ×
          </Button>)}
          <div className="sb-study-actions">
            <Button type="submit" disabled={busy || !draft.title.trim() || (!draft.body.trim() && !draft.strokes.length)}>{t.save}</Button>
            <Button type="button" variant="ghost" onClick={() => setDraft(null)}>{t.cancel}</Button>
          </div>
        </form>}
      </aside>
    </div>
  </section>;
}
