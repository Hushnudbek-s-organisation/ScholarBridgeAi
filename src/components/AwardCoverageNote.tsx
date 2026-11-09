"use client";
import {useTranslations} from 'next-intl';
/** Scope disclosure is independent of a catalogue's funding-type label. */
export function AwardCoverageNote({state}:{state?:'applicable'|'not_applicable'|'unknown'}){
 const t=useTranslations('common');
 if(state!=='unknown')return null;
 return <span data-award-coverage="unknown" className="block text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t('awardCoverageUnknown')}</span>;
}
