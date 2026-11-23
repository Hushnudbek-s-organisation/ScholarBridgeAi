"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Eraser, PenLine, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { STUDY_COLORS, studyWikiTokens, type StudyStroke } from "@/lib/study-map";

const markdownInline = /(`[^`\n]+`|!?\[[^\]\n]+\]\([^)\n]+\)|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;

function inline(text: string, resolve: (target: string) => string | undefined, open: (id: string) => void) {
  return text.split(/(`[^`\n]+`|\[\[[^\n]+?\]\])/g).flatMap((part, index): ReactNode[] => {
    const wiki = studyWikiTokens(part)[0];
    if (wiki?.raw === part) {
      const id = resolve(wiki.target);
      return [id ? <Button key={index} variant="unstyled" className="sb-study-wiki" onClick={() => open(id)}>{wiki.label}</Button>
        : <span className="sb-study-wiki-missing" key={index}>{part}</span>];
    }
    return part.split(markdownInline).map((token, i) => {
      const key = `${index}-${i}`;
      if (token.startsWith("`") && token.endsWith("`")) return <code key={key}>{token.slice(1, -1)}</code>;
      if (/^\*\*.+\*\*$/.test(token)) return <strong key={key}>{token.slice(2, -2)}</strong>;
      if (/^\*.+\*$/.test(token)) return <em key={key}>{token.slice(1, -1)}</em>;
      const markdownLink = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (markdownLink) {
        const [, name, href] = markdownLink;
        if (/^https?:\/\//i.test(href)) return <a key={key} href={href} target="_blank" rel="noopener noreferrer">{name}</a>;
        const id = href.endsWith(".md") && resolve(href.slice(0, -3).replace(/%20/g, " "));
        if (id) return <Button key={key} variant="unstyled" className="sb-study-wiki" onClick={() => open(id)}>{name}</Button>;
      }
      return token;
    });
  });
}

export function StudyMarkdown({ body, resolve, open, toggleTask, taskLabel }: {
  body: string;
  resolve: (target: string) => string | undefined;
  open: (id: string) => void;
  toggleTask?: (line: number) => void;
  taskLabel: string;
}) {
  const lines = body.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.startsWith("```")) {
      const code: string[] = [];
      const key = i;
      while (i + 1 < lines.length && !lines[i + 1].startsWith("```")) code.push(lines[++i]);
      blocks.push(<pre key={key}><code>{code.join("\n")}</code></pre>);
      if (i + 1 < lines.length) i++;
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      const Tag = heading[1].length <= 2 ? "h3" : "h4";
      blocks.push(<Tag key={i}>{inline(heading[2], resolve, open)}</Tag>);
      continue;
    }
    const list = /^\s*([-*+] |\d+\. )/.exec(line);
    if (list) {
      const ordered = /\d/.test(list[1]);
      const Tag = ordered ? "ol" : "ul";
      const pattern = ordered ? /^\s*\d+\. (.*)$/ : /^\s*[-*+] (.*)$/;
      const items: ReactNode[] = [];
      const key = i;
      let match = pattern.exec(lines[i]);
      while (match) {
        const task = /^\[([ xX])\] (.+)$/.exec(match[1]);
        const index = i;
        items.push(<li key={index}>{task
          ? <span className="sb-study-task"><input type="checkbox" aria-label={task[2] || taskLabel} checked={task[1].toLowerCase() === "x"}
              disabled={!toggleTask} onChange={() => toggleTask?.(index)} />{inline(task[2], resolve, open)}</span>
          : inline(match[1], resolve, open)}</li>);
        match = pattern.exec(lines[i + 1] ?? "");
        if (!match) break;
        i++;
      }
      blocks.push(<Tag key={key}>{items}</Tag>);
      continue;
    }
    if (line.startsWith("> ")) blocks.push(<blockquote key={i}>{inline(line.slice(2), resolve, open)}</blockquote>);
    else blocks.push(<p key={i}>{inline(line, resolve, open)}</p>);
  }
  return <div className="sb-study-markdown">{blocks}</div>;
}

export type SketchLabels = { drawing: string; pen: string; eraser: string; color: string; width: string; undo: string; clear: string };
type Props = { strokes: StudyStroke[]; labels: SketchLabels; change?: (strokes: StudyStroke[]) => void };

export function StudySketch({ strokes, labels, change }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const current = useRef<{ id: number; stroke: StudyStroke } | null>(null);
  const state = useRef(strokes);
  const [ink, setInk] = useState<string>(STUDY_COLORS[0]);
  const [width, setWidth] = useState(4);
  const [eraser, setEraser] = useState(false);
  const [undo, setUndo] = useState<StudyStroke[][]>([]);

  function render(all: StudyStroke[]) {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !canvas.current) return;
    const { width, height } = canvas.current;
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const { color, size, points } of all) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      const [x, y] = points[0];
      ctx.moveTo(x * width / 1000, y * height / 1000);
      for (const [px, py] of points.slice(1)) ctx.lineTo(px * width / 1000, py * height / 1000);
      if (points.length === 1) ctx.lineTo(x * width / 1000 + .2, y * height / 1000);
      ctx.stroke();
    }
  }
  useEffect(() => { state.current = strokes; render(strokes); }, [strokes]);

  function point(event: PointerEvent<HTMLCanvasElement>): [number, number] {
    const box = event.currentTarget.getBoundingClientRect();
    const scale = (value: number, length: number) => Math.round(Math.min(1000, Math.max(0, value * 1000 / Math.max(length, 1))));
    return [scale(event.clientX - box.left, box.width), scale(event.clientY - box.top, box.height)];
  }
  function commit(next: StudyStroke[]) {
    const previous = state.current;
    setUndo(history => [...history.slice(-19), previous]);
    state.current = next;
    render(next);
    change?.(next);
  }
  return <div className="sb-study-sketch">
    {change && <div className="sb-study-actions sb-study-ink">
      <Button type="button" variant="outline" aria-pressed={!eraser} onClick={() => setEraser(false)}><PenLine size={15} />{labels.pen}</Button>
      <Button type="button" variant="outline" aria-pressed={eraser} onClick={() => setEraser(true)}><Eraser size={15} />{labels.eraser}</Button>
      <label>{labels.color}<input aria-label={labels.color} type="color" value={ink} onChange={event => setInk(event.target.value)} /></label>
      <label>{labels.width}<input aria-label={labels.width} type="range" min={1} max={12} value={width} onChange={event => setWidth(Number(event.target.value))} /></label>
      <Button type="button" variant="ghost" disabled={!undo.length} onClick={() => {
        const next = undo.at(-1);
        if (!next) return;
        setUndo(undo.slice(0, -1)); state.current = next; change(next);
      }}><Undo2 size={15} />{labels.undo}</Button>
      <Button type="button" variant="ghost" disabled={!strokes.length} onClick={() => commit([])}>{labels.clear}</Button>
    </div>}
    <canvas ref={canvas} width={760} height={430} aria-label={labels.drawing} data-editable={change ? true : undefined}
      onPointerDown={event => {
        if (!change || event.button !== 0 || current.current) return;
        const [x, y] = point(event);
        if (eraser) {
          const hit = state.current.findLastIndex(stroke => stroke.points.some(([px, py]) => Math.hypot(px - x, py - y) < 30));
          if (hit >= 0) commit(state.current.filter((_, i) => i !== hit));
          return;
        }
        if (state.current.length >= 40) return;
        const stroke = { color: ink, size: width, points: [[x, y] as [number, number]] };
        current.current = { id: event.pointerId, stroke };
        event.currentTarget.setPointerCapture(event.pointerId);
        render([...state.current, stroke]);
      }}
      onPointerMove={event => {
        const draft = current.current;
        if (!draft || draft.id !== event.pointerId) return;
        const [x, y] = point(event);
        const last = draft.stroke.points.at(-1)!;
        if (Math.hypot(x - last[0], y - last[1]) < 5) return;
        if (draft.stroke.points.length === 100) draft.stroke.points = draft.stroke.points.filter((_, i) => i % 2 === 0 || i === 99);
        draft.stroke.points.push([x, y]);
        render([...state.current, draft.stroke]);
      }}
      onLostPointerCapture={event => {
        const draft = current.current;
        if (!draft || draft.id !== event.pointerId) return;
        current.current = null;
        const next = [...state.current, draft.stroke];
        if (JSON.stringify(next).length <= 8400) commit(next);
        else render(state.current);
      }} />
  </div>;
}
