"use client";

/**
 * Universal lesson player.
 *
 * Lessons are entered by hand in the admin panel, and instructors paste
 * whatever link the video lives at: a YouTube watch link, a Shorts link, a
 * Vimeo page, a Loom share link, or a direct .mp4 file on a CDN/bucket. The
 * previous player rendered every one of those into `<video src=…>`, so a
 * YouTube URL produced a black box that never played.
 *
 * `parseVideoEmbed()` classifies the URL (pure, exported, unit-checked) and
 * the component then renders the right player:
 *   - iframe  → youtube-nocookie / Vimeo / Loom embed with the sandboxed
 *               `allow` list those players need;
 *   - video   → the HTML5 `<video>` element for real media files.
 */
import React from "react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";

export type VideoEmbed =
  | { kind: "iframe"; embedUrl: string; provider: "YouTube" | "Vimeo" | "Loom" | "Embed"; watchUrl: string }
  | { kind: "video"; src: string; provider: "Video" | "Audio" }
  | { kind: "none"; provider: "None" };

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;

function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return YOUTUBE_ID.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v") ?? "";
      return YOUTUBE_ID.test(id) ? id : null;
    }
    const m = url.pathname.match(/^\/(?:embed|shorts|v|live)\/([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  return null;
}

function vimeoId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = url.pathname.match(/\/(?:video\/)?(\d{6,})/);
    return m ? m[1] : null;
  }
  return null;
}

function loomId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "loom.com") {
    const m = url.pathname.match(/^\/(?:share|embed)\/([a-zA-Z0-9]+)/);
    return m ? m[1] : null;
  }
  return null;
}

const MEDIA_EXTENSION = /\.(mp4|webm|ogg|ogv|mov|m4v|m3u8|mp3|m4a)(\?.*)?$/i;

/**
 * Classify a lesson video URL.
 *
 * Anything that is not a recognised embed provider is played as a media file —
 * including extension-less CDN URLs — which preserves the previous behaviour
 * for direct links instead of silently breaking them.
 */
export function parseVideoEmbed(rawUrl: string | null | undefined): VideoEmbed {
  const value = (rawUrl ?? "").trim();
  if (!value) return { kind: "none", provider: "None" };

  let url: URL | null = null;
  try {
    url = new URL(value);
  } catch {
    url = null;
  }
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) {
    return { kind: "none", provider: "None" };
  }

  const yt = youtubeId(url);
  if (yt) {
    return {
      kind: "iframe",
      provider: "YouTube",
      watchUrl: value,
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1`,
    };
  }

  const vimeo = vimeoId(url);
  if (vimeo) {
    return {
      kind: "iframe",
      provider: "Vimeo",
      watchUrl: value,
      embedUrl: `https://player.vimeo.com/video/${vimeo}`,
    };
  }

  const loom = loomId(url);
  if (loom) {
    return { kind: "iframe", provider: "Loom", watchUrl: value, embedUrl: `https://www.loom.com/embed/${loom}` };
  }

  // A page that only embeds a player (iframe-style links) is rendered as-is.
  if (/\/embed(\/|$)/.test(url.pathname) && !MEDIA_EXTENSION.test(url.pathname)) {
    return { kind: "iframe", provider: "Embed", watchUrl: value, embedUrl: value };
  }

  const audio = /\.(mp3|m4a)(\?.*)?$/i.test(url.pathname);
  return { kind: "video", src: value, provider: audio ? "Audio" : "Video" };
}

/** Whether a URL is a supported lesson video (used by the admin validator). */
export function isPlayableVideoUrl(url: string | null | undefined): boolean {
  return parseVideoEmbed(url).kind !== "none";
}

/** YouTube thumbnail for a video URL, or null for other providers. */
export function youtubeThumbnailUrl(rawUrl: string | null | undefined): string | null {
  const value = (rawUrl ?? "").trim();
  if (!value) return null;
  try {
    const id = youtubeId(new URL(value));
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  } catch {
    return null;
  }
}

export interface SmartVideoPlayerProps {
  url: string | null | undefined;
  title: string;
  /** Called with the playhead in seconds while a native media file plays. */
  onTimeUpdate?: (seconds: number) => void;
  /** Called when a native media file reaches its end. */
  onEnded?: () => void;
  /** Shown instead of a player when the lesson has no video. */
  emptyLabel?: string;
  className?: string;
  /** Admin preview: no autoplay-ish behaviour, smaller frame. */
  compact?: boolean;
}

export function SmartVideoPlayer({
  url,
  title,
  onTimeUpdate,
  onEnded,
  emptyLabel,
  className = "",
  compact = false,
}: SmartVideoPlayerProps) {
  const t = useTranslations("courses");
  const embed = parseVideoEmbed(url);
  const frame = compact ? "aspect-video w-full" : "w-full aspect-video";

  if (embed.kind === "none") {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs font-medium text-slate-500 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-400 ${frame} ${className}`}
      >
        {emptyLabel ?? t("noVideoYet")}
      </div>
    );
  }

  if (embed.kind === "iframe") {
    return (
      <div className={className}>
        <iframe
          key={embed.embedUrl}
          src={embed.embedUrl}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className={`${frame} border-0 bg-black`}
        />
        <p className="flex items-center justify-end gap-1 px-1 pt-1 text-[10px] font-semibold text-slate-400">
          {embed.provider === "Embed" ? t("externalVideoPlayer") : embed.provider}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <video
        key={embed.src}
        src={embed.src}
        controls
        playsInline
        preload="metadata"
        title={title}
        className={`${frame} bg-black`}
        onTimeUpdate={onTimeUpdate ? (e) => onTimeUpdate(Math.floor(e.currentTarget.currentTime)) : undefined}
        onEnded={onEnded}
      />
    </div>
  );
}
