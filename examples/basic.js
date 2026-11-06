// 実行：node examples/basic.js
const koyomi = require("../koyomi.js");

// 1日分の情報
console.log(koyomi.info(2026, 11, 3));

// 2027年6月の土日祝で、大安の日を探す
const days = koyomi.month(2027, 6).filter(
  (x) => x.rokuyo === "大安" && (x.w === 0 || x.w === 6 || x.holiday)
);
console.log(days.map((x) => `${x.m}月${x.d}日（${x.week}）`));

// 対応範囲の外は例外になる
try {
  koyomi.info(2033, 1, 1);
} catch (e) {
  console.log(e.name, e.message);
}
