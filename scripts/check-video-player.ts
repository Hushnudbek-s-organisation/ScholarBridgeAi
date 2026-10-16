/**
 * Universal lesson player + practical course catalogues (Priority 2).
 *
 * Three things are proven here, none of which `next build` can see:
 *
 *   1. `parseVideoEmbed()` classifies every URL shape an admin actually pastes
 *      — YouTube watch/shorts/youtu.be/embed, Vimeo, Loom, a direct .mp4 — and
 *      refuses anything that is not a real video (javascript:, plain text).
 *   2. `SmartVideoPlayer` renders an iframe for embeds and a <video> element
 *      for media files, so a YouTube lesson can no longer become a black box.
 *   3. The practical courses land in the right catalogue track, and the seeded
 *      "how-to" titles are recognised by that classifier.
 *
 * Run: npm run test:video
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseVideoEmbed, youtubeThumbnailUrl, isPlayableVideoUrl, SmartVideoPlayer } from "../src/components/SmartVideoPlayer";
import { LessonNotes } from "../src/components/LessonNotes";
import { COURSE_TRACKS, courseMatchesTrack, courseTrackOf } from "../src/lib/courseTracks";

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
const section = (t: string) => console.log(`\n${t}`);

section("parseVideoEmbed — YouTube");
{
  const watch = parseVideoEmbed("https://www.youtube.com/watch?v=rM2x2j03haU");
  check("watch URL becomes a privacy-friendly embed", watch.kind === "iframe" && watch.embedUrl === "https://www.youtube-nocookie.com/embed/rM2x2j03haU?rel=0&modestbranding=1");
  check("watch URL is labelled YouTube", watch.kind === "iframe" && watch.provider === "YouTube");

  const shortLink = parseVideoEmbed("https://youtu.be/BuFfLdSUjHM?t=42");
  check("youtu.be short link is recognised", shortLink.kind === "iframe" && shortLink.embedUrl.includes("BuFfLdSUjHM"));

  const shorts = parseVideoEmbed("https://www.youtube.com/shorts/rM2x2j03haU");
  check("YouTube Shorts is recognised", shorts.kind === "iframe" && shorts.embedUrl.includes("rM2x2j03haU"));

  const nocookie = parseVideoEmbed("https://www.youtube-nocookie.com/embed/rM2x2j03haU");
  check("an existing nocookie embed keeps its id", nocookie.kind === "iframe" && nocookie.embedUrl.includes("rM2x2j03haU"));

  const live = parseVideoEmbed("https://www.youtube.com/live/rM2x2j03haU");
  check("a live URL is recognised", live.kind === "iframe" && live.embedUrl.includes("rM2x2j03haU"));

  const tooShort = parseVideoEmbed("https://www.youtube.com/watch?v=abc");
  check("a malformed YouTube id is not treated as a YouTube video", tooShort.kind === "video");

  check("thumbnail is derived from the id", youtubeThumbnailUrl("https://youtu.be/BuFfLdSUjHM") === "https://img.youtube.com/vi/BuFfLdSUjHM/hqdefault.jpg");
  check("no thumbnail for non-YouTube links", youtubeThumbnailUrl("https://vimeo.com/12345678") === null);
}

section("parseVideoEmbed — Vimeo, Loom and direct files");
{
  const vimeo = parseVideoEmbed("https://vimeo.com/76979871");
  check("Vimeo page URL becomes a player embed", vimeo.kind === "iframe" && vimeo.embedUrl === "https://player.vimeo.com/video/76979871");
  const vimeoPlayer = parseVideoEmbed("https://player.vimeo.com/video/76979871");
  check("an existing Vimeo player URL is reused", vimeoPlayer.kind === "iframe" && vimeoPlayer.embedUrl.includes("76979871"));

  const loom = parseVideoEmbed("https://www.loom.com/share/8f1c2b7d9e4a4c6fb2d1");
  check("Loom share link becomes a Loom embed", loom.kind === "iframe" && loom.embedUrl === "https://www.loom.com/embed/8f1c2b7d9e4a4c6fb2d1");
  const loomEmbed = parseVideoEmbed("https://www.loom.com/embed/8f1c2b7d9e4a4c6fb2d1");
  check("Loom embed link stays a Loom embed", loomEmbed.kind === "iframe" && loomEmbed.embedUrl.includes("/embed/8f1c2b7d9e4a4c6fb2d1"));

  const mp4 = parseVideoEmbed("https://cdn.example.com/lessons/common-app.mp4");
  check("a direct .mp4 stays a native video", mp4.kind === "video" && mp4.src.endsWith(".mp4"));
  check(".webm is a native video", parseVideoEmbed("https://cdn.example.com/lesson.webm").kind === "video");
  check(".mov is a native video", parseVideoEmbed("https://cdn.example.com/lesson.mov#t=10").kind === "video");
  check("an extension-less CDN URL still plays as a video", parseVideoEmbed("https://cdn.example.com/abc123").kind === "video");

  check("empty input renders nothing", parseVideoEmbed("").kind === "none");
  check("whitespace input renders nothing", parseVideoEmbed("   ").kind === "none");
  check("a javascript: URL is refused", parseVideoEmbed("javascript:alert(1)").kind === "none");
  check("a bare word is refused", parseVideoEmbed("not a url").kind === "none");
  check("isPlayableVideoUrl agrees with parseVideoEmbed", isPlayableVideoUrl("https://youtu.be/BuFfLdSUjHM") && !isPlayableVideoUrl(""));
}

section("SmartVideoPlayer rendering");
{
  const youtube = renderToStaticMarkup(React.createElement(SmartVideoPlayer, { url: "https://www.youtube.com/watch?v=rM2x2j03haU", title: "Common App setup" }));
  check("a YouTube lesson renders an iframe", youtube.includes("<iframe") && youtube.includes("youtube-nocookie.com/embed/rM2x2j03haU"));
  check(
    "the iframe carries the permissions the players need",
    youtube.includes("encrypted-media") && youtube.includes("picture-in-picture") && /allowfullscreen/i.test(youtube),
  );
  check("the iframe is titled for screen readers", youtube.includes('title="Common App setup"'));

  const file = renderToStaticMarkup(React.createElement(SmartVideoPlayer, { url: "https://cdn.example.com/lesson.mp4", title: "Lesson" }));
  check("a media file renders the native <video> element", file.includes("<video") && file.includes('src="https://cdn.example.com/lesson.mp4"'));
  check("the native player keeps controls and inline playback", file.includes("controls") && /playsinline/i.test(file));

  const empty = renderToStaticMarkup(React.createElement(SmartVideoPlayer, { url: "", title: "Lesson", emptyLabel: "No video attached to this lesson yet" }));
  check("an empty lesson shows the empty label, not a broken player", empty.includes("No video attached") && !empty.includes("<video") && !empty.includes("<iframe>"));
}

section("LessonNotes formatting");
{
  const content = [
    "### Step 1 — Create the account",
    "- Apostille the **original** first.",
    "1. Open commonapp.org",
    "2. Sign the FERPA waiver",
    "See https://www.commonapp.org/apply for the current cycle.",
  ].join("\n");
  const html = renderToStaticMarkup(React.createElement(LessonNotes, { content }));

  check("a heading is rendered as a heading, not a paragraph", html.includes("<h4"));
  check("bullet lists become list items", html.includes("<ul") && html.includes("<li"));
  check("numbered steps become an ordered list", html.includes("<ol"));
  check("bold markers are rendered as <strong>, not left as **", html.includes("<strong") && !html.includes("**original**"));
  check("a URL becomes a clickable external link", html.includes('href="https://www.commonapp.org/apply"') && html.includes('rel="noopener noreferrer"'));
  check("empty content renders nothing", renderToStaticMarkup(React.createElement(LessonNotes, { content: "" })) === "");
}

section("Course tracks");
{
  const seeded: [string, string][] = [
    ["How to Use Common App & CSS Profile: Step-by-Step US Application Guide", "portals"],
    ["European University Portals: uni-assist VPD, TUMonline, DreamApply & Sperrkonto", "portals"],
    ["Uzbekistan Flagship Grants & Documents: El-yurt umidi, GKS Korea, Türkiye Bursları & e-Apostille", "scholarships"],
    ["How to Use ScholarBridge AI: Complete Platform Walkthrough", "portals"],
    ["National Olympiad Preparation & Exam Mastery", "exams"],
  ];
  for (const [title, expected] of seeded) {
    const track = courseTrackOf(title);
    check(`"${title.slice(0, 42)}…" is filed under ${expected}`, track === expected, `got ${track}`);
  }
  check("every track key is known to the UI", COURSE_TRACKS.includes("all") && COURSE_TRACKS.length === 5);
  check("the All track matches any course", courseMatchesTrack({ title: "Anything at all" }, "all"));
  check("a specific track filters", !courseMatchesTrack({ title: "How to Use Common App" }, "exams"));
}

console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
