"use client";
import {useTranslations} from "next-intl";
import type {RequirementEvaluation} from "@/lib/requirementGroups";
export function RequirementGroupView({evaluation}:{evaluation:RequirementEvaluation}){
  const t=useTranslations("profile.context");
  const render=(node:RequirementEvaluation)=><li key={node.id} className="min-w-0 rounded-control border border-slate-200 p-3 dark:border-slate-700">
    <div className="flex flex-wrap items-start justify-between gap-2"><span className="break-words text-sm font-medium">{node.label}</span><span className="text-sm">{t(`groupStates.${node.state}` as never)}</span></div>
    {node.actual!=null&&node.required!=null&&<p className="mt-1 text-sm tabular-nums">{String(node.actual)} / {node.required} {node.unit}</p>}
    {node.state==="unknown"&&<p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t(`groupReasons.${node.reason}` as never)}</p>}
    {node.operator&&node.operator!=="not_applicable"&&<p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{node.operator==="anyOf"?t("anyOf"):node.operator==="allOf"?t("allOf"):t("groupReasons.unknown_operator")}</p>}
    {node.children.length>0&&<ul className="mt-2 space-y-2 border-l border-slate-200 pl-3 dark:border-slate-700">{node.children.map(render)}</ul>}
  </li>;
  return <div className="mt-3"><p className="mb-2 text-sm text-slate-600 dark:text-slate-300">{t("groupHint")}</p><ul>{render(evaluation)}</ul></div>;
}
