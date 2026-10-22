import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const taskUi = readFileSync("src/components/TaskRoadmap.tsx", "utf8");
const home = readFileSync("src/app/HomeClient.tsx", "utf8");
const taskApi = readFileSync("src/app/api/tasks/route.ts", "utf8");
const tasksHub = readFileSync("src/components/hubs/index.tsx", "utf8");
const timeline = readFileSync("src/components/SmartTimelineCalendar.tsx", "utf8");
const guidedJourney = readFileSync("src/components/GuidedJourneyBar.tsx", "utf8");

assert.match(taskUi, /new CustomEvent\("scholarbridge:tasks-updated", \{ detail: \{ profileId \} \}\)/);
for (const handler of ["handleToggleTask", "handleAddTask", "handleDeleteTask"]) {
  const start = taskUi.indexOf(`const ${handler}`);
  const end = taskUi.indexOf("\n  const ", start + 1);
  assert.ok(start >= 0 && end > start, `${handler} exists`);
  const body = taskUi.slice(start, end);
  assert.match(body, /res\.ok/ , `${handler} checks server success`);
  assert.match(body, /notifyTasksUpdated\(profileId|notifyTasksUpdated\(activeProfile\.id\)/, `${handler} dispatches after success`);
}
assert.match(taskApi, /requireProfileAccess\(req, profileId\)/);
assert.match(taskApi, /requireRowAccess\(req, await findTaskOwner\(id\)\)/);
assert.match(taskApi, /isCompleted must be true or false/);
assert.match(tasksHub, /<TaskRoadmap key=\{profile\.id\} activeProfile=\{profile\}/);
assert.match(timeline, /written > 0[\s\S]*scholarbridge:tasks-updated/);
assert.match(home, /res\.ok\)[\s\S]*scholarbridge:tasks-updated/);
assert.match(guidedJourney, /detail\?\.profileId === profileId[\s\S]*refreshTaskCount/);
assert.match(guidedJourney, /removeEventListener\("scholarbridge:tasks-updated", onTasksUpdated\)/);
assert.match(guidedJourney, /request !== taskRequest/);
assert.match(guidedJourney, /taskCount\?\.profileId === profileId \? taskCount\.count : null/);
console.log("Task state and badge synchronization checks passed.");
