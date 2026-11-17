import assert from "node:assert/strict";
import { SOP_SAMPLES } from "../src/lib/samples/exemplars";
import { schollySopCandidates } from "../src/lib/scholly-sop-reward.server";

const paragraph = "During the winter robotics club, I designed a sensor enclosure to protect a small board from condensation. Our first print cracked when the door closed, so I measured the frame again and redesigned the joint. This exercise taught me to document failed assumptions before ordering materials.";
const another = "My community library asked me to explain why their volunteer schedule regularly left the reading room unattended. After interviewing three volunteers, I compared their calendars and noticed that classes ended later on Wednesdays. We introduced one longer afternoon shift and let each family choose a predictable check-in time.";
const words = paragraph.split(" ");
const forty = words.slice(0, 40).join(" ");
assert.equal(schollySopCandidates(words.slice(0, 39).join(" ")).length, 0);
assert.equal(schollySopCandidates(forty).length, 1);
assert.equal(schollySopCandidates("test repeat ".repeat(80)).length, 0);
assert.equal(schollySopCandidates(`${paragraph}\n\n${paragraph}`).length, 1);
assert.equal(schollySopCandidates(paragraph.toUpperCase().replaceAll(".", "!"), [paragraph]).length, 0);
assert.equal(schollySopCandidates(paragraph.replace("ordering materials", "selecting hardware"), [paragraph]).length, 0);
assert.equal(schollySopCandidates([...words].reverse().join(" "), [paragraph]).length, 0);
assert.equal(schollySopCandidates(`${paragraph}\n\n${another}`, [paragraph]).length, 1);
assert.equal(schollySopCandidates(SOP_SAMPLES[0].text).length, 0);
assert.equal(schollySopCandidates(`[${paragraph}]`).length, 0);
console.log("Scholly SOP minimum, novelty, historical duplicate, sample and filler checks passed.");
