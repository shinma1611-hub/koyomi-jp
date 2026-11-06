"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const K = require("../koyomi.js");
const golden = require("./koyomi-golden.json");
const ROOT = path.join(__dirname, "..");

const line = (i) => [i.week, i.rokuyo, i.holiday || "", i.sekki || "", i.eto, i.ichiryu ? "1" : "", i.tensha ? "1" : "", i.lunar].join("|");

test("比較表が2022〜2032年の全日を抜けなく持っている", () => {
  const keys = Object.keys(golden);
  assert.equal(keys.length, 4018);
  let n = Date.UTC(2022, 0, 1);
  for (const k of keys) {
    assert.equal(k, new Date(n).toISOString().slice(0, 10));
    n += 86400000;
  }
  assert.equal(keys.at(-1), "2032-12-31");
});

test("全日が比較表と一致する", () => {
  for (const [k, v] of Object.entries(golden)) {
    const [y, m, d] = k.split("-").map(Number);
    assert.equal(line(K.info(y, m, d)), v, k);
  }
});

test("month は info と同じ内容を日数分返す", () => {
  const days = K.month(2026, 2);
  assert.equal(days.length, 28);
  assert.equal(K.month(2028, 2).length, 29);
  assert.deepEqual(days[13], K.info(2026, 2, 14));
});

test("旧正月は旧暦1月1日で先勝になる", () => {
  for (const [y, m, d] of [[2024, 2, 10], [2025, 1, 29], [2026, 2, 17], [2027, 2, 7]]) {
    const i = K.info(y, m, d);
    assert.equal(i.lunar, "1月1日");
    assert.equal(i.rokuyo, "先勝");
  }
});

test("閏月がある年を正しく扱う", () => {
  assert.equal(K.info(2023, 3, 22).lunar, "閏2月1日");
  assert.equal(K.info(2025, 7, 25).lunar, "閏6月1日");
  const leaps = new Set();
  for (let y = K.MIN_YEAR; y <= K.MAX_YEAR; y++) {
    for (let m = 1; m <= 12; m++) {
      for (const i of K.month(y, m)) {
        if (i.lunar.startsWith("閏")) leaps.add(`${y}:${i.lunar.replace(/\d+日$/, "")}`);
      }
    }
  }
  assert.deepEqual([...leaps], ["2023:閏2月", "2025:閏6月", "2028:閏5月", "2031:閏3月"]);
});

test("六曜は（旧暦の月＋日）を6で割った余りで決まる", () => {
  for (const v of Object.values(golden)) {
    const [, rokuyo, , , , , , lunar] = v.split("|");
    const [, mon, day] = lunar.match(/(\d+)月(\d+)日/).map(Number);
    assert.equal(rokuyo, K.ROKUYO[(mon + day) % 6]);
  }
});

test("祝日、振替休日、国民の休日", () => {
  const cases = [
    [2026, 1, 1, "元日"], [2026, 1, 12, "成人の日"], [2026, 3, 20, "春分の日"],
    [2026, 5, 6, "振替休日"], [2026, 9, 22, "国民の休日"], [2026, 9, 23, "秋分の日"],
    [2026, 11, 3, "文化の日"], [2026, 11, 4, null],
  ];
  for (const [y, m, d, want] of cases) assert.equal(K.info(y, m, d).holiday, want, `${y}-${m}-${d}`);
});

test("二十四節気、干支、天赦日", () => {
  assert.equal(K.info(2022, 1, 5).sekki, "小寒");
  assert.equal(K.info(2022, 2, 4).sekki, "立春");
  assert.equal(K.info(2022, 1, 6).sekki, null);
  assert.equal(K.info(2022, 1, 1).eto, "甲寅");
  assert.equal(K.info(2022, 1, 11).eto, "甲子");
  assert.equal(K.info(2022, 1, 11).tensha, true);
  assert.equal(K.info(2022, 1, 11).ichiryu, true);
});

test("午前0時に近い節気の日付", () => {
  const table = [
    [2023, 1, 6, "小寒"], [2023, 6, 21, "夏至"], [2024, 8, 22, "処暑"], [2024, 12, 7, "大雪"],
    [2025, 12, 22, "冬至"], [2030, 2, 18, "雨水"], [2030, 6, 5, "芒種"], [2031, 11, 8, "立冬"],
  ];
  for (const [y, m, d, want] of table) assert.equal(K.info(y, m, d).sekki, want, `${y}-${m}-${d}`);
});

test("対応範囲の端は計算でき、外は例外になる", () => {
  assert.equal(K.info(2022, 1, 1).lunar, "11月29日");
  assert.equal(line(K.info(2032, 12, 31)), golden["2032-12-31"]);
  assert.throws(() => K.info(2021, 12, 31), RangeError);
  assert.throws(() => K.info(2033, 1, 1), RangeError);
  assert.throws(() => K.month(2021, 12), RangeError);
  assert.throws(() => K.month(2033, 1), RangeError);
});

test("存在しない日付や数値でない引数は例外になる", () => {
  assert.throws(() => K.info(2026, 2, 29), RangeError);
  assert.throws(() => K.info(2026, 13, 1), RangeError);
  assert.throws(() => K.info(2026, 0, 1), RangeError);
  assert.throws(() => K.info(2026, 1, 0), RangeError);
  assert.throws(() => K.month(2026, 13), RangeError);
  assert.throws(() => K.info("2026", 1, 1), TypeError);
  assert.throws(() => K.info(2026, 1, 1.5), TypeError);
  assert.throws(() => K.info(2026, 1), TypeError);
  assert.throws(() => K.month(2026), TypeError);
});

test("端末の時間帯が変わっても結果が変わらない", () => {
  const code = `const K=require("./koyomi.js"),g=require("./test/koyomi-golden.json");
    for(const[k,v]of Object.entries(g)){const[y,m,d]=k.split("-").map(Number),i=K.info(y,m,d);
    const s=[i.week,i.rokuyo,i.holiday||"",i.sekki||"",i.eto,i.ichiryu?"1":"",i.tensha?"1":"",i.lunar].join("|");
    if(s!==v)throw new Error(k)}`;
  for (const TZ of ["UTC", "America/Los_Angeles", "Pacific/Kiritimati"]) {
    const r = spawnSync(process.execPath, ["-e", code], { cwd: ROOT, env: { ...process.env, TZ }, encoding: "utf8" });
    assert.equal(r.status, 0, `${TZ}: ${r.stderr}`);
  }
});

test("読み込み方：require、import、script タグ", async () => {
  const esm = await import("../koyomi.mjs");
  assert.equal(esm.info, K.info);
  assert.equal(esm.default.month, K.month);
  assert.equal(esm.MAX_YEAR, 2032);

  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "koyomi.js"), "utf8"), sandbox);
  assert.equal(sandbox.Koyomi.info(2026, 1, 1).holiday, "元日");
});

test("使い方の例がそのまま動く", () => {
  const r = spawnSync(process.execPath, ["examples/basic.js"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /RangeError/);
});

test("節気の日付が国立天文台と JPL Horizons の値に合う", () => {
  const cases = [
    [2023, 1, 5, null], [2023, 1, 6, "小寒"], [2023, 6, 21, "夏至"], [2023, 6, 22, null],
    [2024, 8, 22, "処暑"], [2024, 12, 7, "大雪"], [2025, 12, 22, "冬至"],
    [2027, 3, 6, "啓蟄"], [2027, 10, 24, "霜降"], [2027, 11, 8, "立冬"],
    [2031, 11, 7, null], [2031, 11, 8, "立冬"],
  ];
  for (const [y, m, d, want] of cases) assert.equal(K.info(y, m, d).sekki, want, `${y}-${m}-${d}`);
});
