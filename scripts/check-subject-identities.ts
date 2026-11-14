import assert from 'node:assert/strict';
import {normalizeSubject,subjectTokens,subjectAffinity} from '../src/lib/subjectAffinity';
import {subjectAlignment} from '../src/lib/matching';
let passed=0,failed=0;function check(name:string,f:()=>void){try{f();passed++;console.log(`PASS ${name}`)}catch(e){failed++;console.error(`FAIL ${name}: ${e instanceof Error?e.message:String(e)}`)}}
check('Cyrillic is not erased',()=>assert.equal(normalizeSubject('Психология'),'психология'));
check('Cyrillic tokens survive',()=>assert.deepEqual(subjectTokens('Компьютерные науки'),['компьютерные','науки']));
check('NFKC full-width ASCII is equivalent',()=>assert.equal(normalizeSubject('Ｃｏｍｐｕｔｅｒ Science'),'computer science'));
for(const [a,b] of [['Computer Science','Компьютерные науки'],['Kompyuter fanlari','Computer Science'],['Informatika','Информатика'],['Dasturiy injiniring','Software Engineering'],['Kompyuter muhandisligi','Computer Engineering'],['Axborot texnologiyalari','Information Technology'],['Машиностроение','Mechanical Engineering'],['Matematika','Математика'],["Sun’iy intellekt","Sunʻiy intellekt"]])check(`reviewed alias ${a} / ${b}`,()=>{const fit=subjectAffinity([a],b);assert(['exact','synonym'].includes(fit.level));assert.equal(fit.score,1);assert.equal(subjectAlignment(a,b).level,'strong')});
for(const [a,b] of [['Computer Science','Software Engineering'],['Computer Science','Computer Engineering'],['Computer Science','Information Technology'],['Computer Engineering','Mechanical Engineering'],['Electrical Engineering','Mechanical Engineering']])check(`related is not identical ${a} / ${b}`,()=>{const fit=subjectAffinity([a],b);assert.equal(fit.level,'partial');assert(fit.score>0&&fit.score<0.85);assert.equal(subjectAlignment(a,b).level,'partial')});
check('unrelated canonical fields do not match',()=>assert.equal(subjectAffinity(['Компьютерные науки'],'Право').level,'none'));
check('blank preference remains unknown',()=>assert.equal(subjectAffinity([], 'Информатика').level,'unknown'));
check('mixed-script spoof is not a reviewed alias',()=>assert.notEqual(subjectAffinity(['Cоmputer Science'],'Информатика').level,'synonym'));
console.log(`SUBJECT_IDENTITIES: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
