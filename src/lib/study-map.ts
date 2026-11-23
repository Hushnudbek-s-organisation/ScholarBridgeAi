export const STUDY_GROUPS = ["profile", "skills", "schools", "funding", "applications", "notes"] as const;
export type StudyGroup = typeof STUDY_GROUPS[number];
export type StudyNode = {
  id: string;
  group: StudyGroup;
  title: string;
  detail?: string;
  route?: string;
  date?: string;
  relatedId?: string;
  done?: boolean;
};
export type StudyEntry = {
  id: string;
  kind: "note" | "card";
  title: string;
  text: string;
  links: string[];
  dueAt: string;
  interval: number;
};
export type StudyMapSnapshot = { nodes: StudyNode[]; entries: StudyEntry[] };
export function nextStudyReview(interval: number, remembered: boolean, now: Date) {
  const next = remembered ? Math.min(90, Math.max(1, interval * 2)) : 0;
  return { interval: next, dueAt: new Date(now.getTime() + (remembered ? next * 86_400_000 : 600_000)) };
}

export const STUDY_COLORS = ["#b49aff", "#6de0ec", "#85b4ff", "#72ddb3", "#ffc38f", "#ec9dde"] as const;
export const STUDY_BODY_LIMIT = 12000;
export const STUDY_LINK_LIMIT = 12;
export const STUDY_DAILY_FOLDER = "Daily";
export type StudyEdge = { from: string; to: string };
type Point = [number, number];
export type StudyStroke = { color: string; size: number; points: Point[] };
export type StudyNote = { body: string; folder: string; pinned: boolean; date: string; metadata?: string; strokes: StudyStroke[] };
const wikiPattern = /\[\[([^\[\]\n|#]+)(?:#[^\[\]\n|]+)?(?:\|([^\[\]\n]+))?\]\]/g;
const fencedCode = /^```[^\n]*\n[\s\S]*?^```[ \t]*$/gm;
const noteHeader = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const sketchBlock = /(?:^|\n)\n?```study-sketch\n([^\n]{1,11500})\n```\s*$/;

export function parseStudyNote(text: string): StudyNote {
  const header = noteHeader.exec(text);
  const body = header ? text.slice(header[0].length) : text;
  const properties = header?.[1].split(/\r?\n/) ?? [];
  const property = (key: string) => properties.find(line => line.startsWith(`${key}: `))?.slice(key.length + 2).trim() ?? "";
  const sketch = sketchBlock.exec(body);
  let strokes: StudyStroke[] = [];
  if (sketch) {
    try {
      const value: unknown = JSON.parse(sketch[1]);
      if (Array.isArray(value)) strokes = value.slice(0, 40).filter(isStudyStroke);
    } catch { /* a malformed export remains readable as text */ }
  }
  return {
    body: (sketch && strokes.length ? body.slice(0, sketch.index) : body).trim(),
    folder: property("folder").slice(0, 80),
    pinned: property("pinned") === "true",
    date: isStudyDate(property("date")) ? property("date") : "",
    metadata: properties.filter(line => !/^(folder|pinned|date):[ \t]/.test(line)).join("\n"),
    strokes,
  };
}

function isStudyStroke(value: unknown): value is StudyStroke {
  if (!value || typeof value !== "object") return false;
  const stroke = value as Partial<StudyStroke>;
  return typeof stroke.color === "string" && /^#[0-9a-f]{6}$/i.test(stroke.color)
    && Number.isInteger(stroke.size) && stroke.size! >= 1 && stroke.size! <= 12
    && Array.isArray(stroke.points) && stroke.points.length > 0 && stroke.points.length <= 100
    && stroke.points.every(point => Array.isArray(point) && point.length === 2
      && point.every(coord => Number.isInteger(coord) && coord >= 0 && coord <= 1000));
}

export function serializeStudyNote({ body, folder, pinned, date, metadata, strokes }: StudyNote) {
  const path = folder.replace(/[\r\n]/g, "").split("/").map(part => part.trim()).filter(Boolean).join("/").slice(0, 80);
  const properties = [metadata?.trim(), path && `folder: ${path}`, pinned && "pinned: true", date && `date: ${date}`].filter(Boolean);
  const header = properties.length ? `---\n${properties.join("\n")}\n---\n` : "";
  const sketch = strokes.length ? `\n\n\`\`\`study-sketch\n${JSON.stringify(strokes)}\n\`\`\`` : "";
  return `${header}${body.trim()}${sketch}`.trim();
}

export function studyTags(body: string, metadata = "") {
  const tags = new Set(Array.from(body.replace(fencedCode, "").matchAll(/(?:^|[^\p{L}\p{N}_/])#([\p{L}\p{N}_][\p{L}\p{N}_/-]{0,47})/gu), result => result[1].toLowerCase()));
  const inline = /^tags:[ \t]*([^\n]+)$/m.exec(metadata)?.[1];
  const listed = /^tags:[ \t]*\n((?:[ \t]+-[ \t]+[^\n]+\n?)+)/m.exec(metadata)?.[1];
  for (const entry of (inline ?? listed ?? "").split(/[,\n]/)) {
    const tag = entry.trim().replace(/^[-\['"# \t]+|[\]' "]+$/g, "");
    if (/^[\p{L}\p{N}_][\p{L}\p{N}_/-]{0,47}$/u.test(tag)) tags.add(tag.toLowerCase());
  }
  return [...tags].sort();
}

export function studyWikiTokens(text: string) {
  return [...text.matchAll(wikiPattern)].map(match => ({ index: match.index!, raw: match[0], target: match[1].trim(), label: match[2]?.trim() || match[1].trim() }));
}

export function buildStudyGraph(snapshot: StudyMapSnapshot) {
  const notes = new Map(snapshot.entries.map(entry => [entry.id, parseStudyNote(entry.text)]));
  const nodes: StudyNode[] = [...snapshot.nodes, ...snapshot.entries.map((entry): StudyNode => {
    const note = notes.get(entry.id)!;
    return { id: entry.id, group: "notes", title: entry.title, detail: entry.kind === "note" ? note.body : undefined };
  })];
  const titles = new Map<string, string[]>();
  const qualify = (title: string) => title.trim().normalize("NFC").toLowerCase();
  const addTitle = (title: string, id: string) => {
    const key = qualify(title);
    const ids = titles.get(key) ?? [];
    if (!ids.includes(id)) titles.set(key, [...ids, id]);
  };
  for (const node of nodes) {
    addTitle(node.title, node.id);
    const folder = notes.get(node.id)?.folder;
    if (folder) addTitle(`${folder}/${node.title}`, node.id);
  }
  const resolve = (title: string) => {
    const matches = titles.get(qualify(title));
    return matches?.length === 1 ? matches[0] : undefined;
  };
  const known = new Set(nodes.map(node => node.id));
  const edges: StudyEdge[] = [];
  const addEdges = (from: string, targets: Iterable<string | undefined>) => {
    for (const to of new Set(targets)) if (to && from !== to && known.has(to)) edges.push({ from, to });
  };
  for (const node of snapshot.nodes) addEdges(node.id, [node.relatedId]);
  for (const entry of snapshot.entries) {
    const wikilinks = studyWikiTokens(notes.get(entry.id)!.body.replace(fencedCode, "").replace(/`[^`\n]+`/g, "")).map(link => resolve(link.target));
    addEdges(entry.id, [...entry.links, ...wikilinks]);
  }
  return { notes, nodes, edges, resolve };
}

export function isStudyDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
