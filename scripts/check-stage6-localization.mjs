#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const locales = ["en", "uz", "ru"];
const assertUniqueJsonKeys = (locale, source) => {
  const tokens = [...source.matchAll(/"(?:\\.|[^"\\])*"|[{}\[\]:,]|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g)].map((m) => m[0]);
  let index = 0;
  const parseValue = () => {
    const token = tokens[index++];
    if (token === "{") {
      const keys = new Set();
      if (tokens[index] === "}") { index++; return; }
      while (index < tokens.length) {
        const keyToken = tokens[index++];
        assert.ok(keyToken?.startsWith('"'), `${locale}: expected object key`);
        const key = JSON.parse(keyToken);
        assert.ok(!keys.has(key), `${locale}: duplicate JSON key ${key}`);
        keys.add(key);
        assert.equal(tokens[index++], ":", `${locale}: expected colon after ${key}`);
        parseValue();
        const separator = tokens[index++];
        if (separator === "}") return;
        assert.equal(separator, ",", `${locale}: expected comma in object`);
      }
      assert.fail(`${locale}: unterminated object`);
    } else if (token === "[") {
      if (tokens[index] === "]") { index++; return; }
      while (index < tokens.length) {
        parseValue();
        const separator = tokens[index++];
        if (separator === "]") return;
        assert.equal(separator, ",", `${locale}: expected comma in array`);
      }
      assert.fail(`${locale}: unterminated array`);
    } else {
      assert.ok(token !== undefined, `${locale}: unexpected end of JSON`);
    }
  };
  parseValue();
  assert.equal(index, tokens.length, `${locale}: trailing JSON tokens`);
};
const parseUnique = (locale) => {
  const source = readFileSync(`src/i18n/messages/${locale}.json`, "utf8");
  assertUniqueJsonKeys(locale, source);
  return JSON.parse(source);
};
const flatten = (value, prefix = "", out = {}) => {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) flatten(child, path, out);
    else out[path] = child;
  }
  return out;
};
const messages = Object.fromEntries(locales.map((locale) => [locale, parseUnique(locale)]));
const flat = Object.fromEntries(locales.map((locale) => [locale, flatten(messages[locale])]));
const placeholderFailures = [];
for (const locale of locales.slice(1)) {
  assert.deepEqual(Object.keys(flat[locale]).sort(), Object.keys(flat.en).sort(), `${locale} key paths match en`);
  for (const key of Object.keys(flat.en)) {
    const vars = (v) => {
      const { parse } = require("@formatjs/icu-messageformat-parser");
      const names = new Set();
      const visit = (nodes) => nodes.forEach((node) => {
        if ([1, 2, 3, 4, 5, 6].includes(node.type)) names.add(node.value);
        if (node.options) Object.values(node.options).forEach((option) => visit(option.value));
      });
      visit(parse(String(v)));
      return [...names].sort();
    };
    try { assert.deepEqual(vars(flat[locale][key]), vars(flat.en[key]), `${locale} placeholders match at ${key}`); } catch { placeholderFailures.push(`${locale}.${key}: en=${vars(flat.en[key])} ${locale}=${vars(flat[locale][key])}`); }
  }
}

assert.equal(placeholderFailures.length, 0, `placeholder mismatches:\n${placeholderFailures.join("\n")}`);

const expected = {
  uz: {
    "university.qsRanking": "QS jahon reytingi 2027",
    "university.dim.standardised_test": "Standartlashtirilgan test",
    "university.dim.cost": "Xarajat va byudjet",
    "university.dim.income": "Oila daromadi",
    "university.dim.funding_requirement": "Moliyalashtirish talabi",
    "university.dim.country": "Tanlangan davlat",
    "university.dim.experience": "Tadqiqot va ish tajribasi",
    "university.dim.major_eligibility": "Mos yo‘nalishlar",
    "university.dim.funding_coverage": "Grant qamrovi",
    "samples.tracks.cvEuropass": "Europass professional CV namunasi",
  },
  ru: {
    "visa.title": "Тренажёр визового интервью с ИИ",
    "university.qsRanking": "Мировой рейтинг QS 2027",
    "university.dim.standardised_test": "Стандартизированный тест",
    "university.dim.cost": "Стоимость и бюджет",
    "university.dim.income": "Доход семьи",
    "university.dim.funding_requirement": "Требование к финансированию",
    "university.dim.country": "Предпочтительная страна",
    "university.dim.experience": "Исследования и опыт работы",
    "university.dim.major_eligibility": "Подходящие направления",
    "university.dim.funding_coverage": "Покрытие гранта",
    "samples.tracks.cvEuropass": "Профессиональное резюме Europass",
  },
};
for (const [locale, entries] of Object.entries(expected)) {
  for (const [key, value] of Object.entries(entries)) assert.equal(flat[locale][key], value, `${locale}.${key}`);
}

const intentionalEmpty = new Set(["ai.essayHighlightWhy.neutral"]);
for (const locale of locales) {
  for (const [key, value] of Object.entries(flat[locale])) {
    if (typeof value === "string" && value.trim() === "") assert.ok(intentionalEmpty.has(key), `unexpected blank message: ${locale}.${key}`);
  }
}
console.log("Stage 6 locale key paths, placeholders, requested translations, and blank-string exception passed.");
