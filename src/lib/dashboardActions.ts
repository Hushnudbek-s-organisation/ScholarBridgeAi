/** One ordered action source for the hero and remaining task list. No second scoring policy. */
export function selectDashboardActions<T extends {id:string}>(steps:readonly T[]):{primary:T|null;remaining:T[]} {
  const seen=new Set<string>();
  const unique=steps.filter(step=>!seen.has(step.id)&&Boolean(seen.add(step.id)));
  return {primary:unique[0]??null,remaining:unique.slice(1)};
}
