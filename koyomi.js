// 日本の暦の計算（六曜・祝日・二十四節気・干支・一粒万倍日・天赦日）。旧暦は日本時間の新月を1日とし、中気を含む月に番号を付ける
(function (root) {
  "use strict";
  const ROKUYO = Object.freeze(["大安", "赤口", "先勝", "友引", "先負", "仏滅"]);
  const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
  const KAN = "甲乙丙丁戊己庚辛壬癸", SHI = "子丑寅卯辰巳午未申酉戌亥";
  const SEKKI = { 315: "立春", 330: "雨水", 345: "啓蟄", 0: "春分", 15: "清明", 30: "穀雨", 45: "立夏", 60: "小満", 75: "芒種", 90: "夏至", 105: "小暑", 120: "大暑", 135: "立秋", 150: "処暑", 165: "白露", 180: "秋分", 195: "寒露", 210: "霜降", 225: "立冬", 240: "小雪", 255: "大雪", 270: "冬至", 285: "小寒", 300: "大寒" };
  const ICHIRYU = { 1: "丑午", 2: "酉寅", 3: "子卯", 4: "卯辰", 5: "巳午", 6: "酉午", 7: "子未", 8: "卯申", 9: "酉午", 10: "酉戌", 11: "亥子", 12: "卯子" };
  const MIN_YEAR = 2022, MAX_YEAR = 2032, DAY = 86400000, R = Math.PI / 180, s = Math.sin;
  const mod = (a, b) => ((a % b) + b) % b;
  // 日付は1970-01-01からの日数で扱う（端末の時間帯に左右されない）
  const num = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / DAY);
  const parts = n => { const t = new Date(n * DAY); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), w: t.getUTCDay() }; };
  const jdMidnight = n => (n * DAY - 9 * 3600000) / DAY + 2440587.5;

  function sunLon(jd) {
    const T = (jd - 2451545.0) / 36525;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * R;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * s(M) + (0.019993 - 0.000101 * T) * s(2 * M) + 0.000289 * s(3 * M);
    const O = (125.04 - 1934.136 * T) * R;
    return mod(L0 + C - 0.00569 - 0.00478 * s(O), 360);
  }
  function newMoonJde(k) {
    const T = k / 1236.85;
    let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4;
    const E = 1 - 0.002516 * T - 0.0000074 * T * T;
    const M = (2.5534 + 29.1053567 * k - 0.0000014 * T * T) * R;
    const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T + 0.00001238 * T ** 3) * R;
    const F = (160.7108 + 390.67050284 * k - 0.0016118 * T * T - 0.00000227 * T ** 3) * R;
    const O = (124.7746 - 1.56375588 * k + 0.0020672 * T * T) * R;
    jde += -0.4072 * s(Mp) + 0.17241 * E * s(M) + 0.01608 * s(2 * Mp) + 0.01039 * s(2 * F) + 0.00739 * E * s(Mp - M)
      - 0.00514 * E * s(Mp + M) + 0.00208 * E * E * s(2 * M) - 0.00111 * s(Mp - 2 * F) - 0.00057 * s(Mp + 2 * F)
      + 0.00056 * E * s(2 * Mp + M) - 0.00042 * s(3 * Mp) + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F)
      - 0.00024 * E * s(2 * Mp - M) - 0.00017 * s(O) - 0.00007 * s(Mp + 2 * M) + 0.00004 * s(2 * Mp - 2 * F)
      + 0.00004 * s(3 * M) + 0.00003 * s(Mp + M - 2 * F) + 0.00003 * s(2 * Mp + 2 * F) - 0.00003 * s(Mp + M + 2 * F)
      + 0.00003 * s(Mp - M + 2 * F) - 0.00002 * s(Mp - M - 2 * F) - 0.00002 * s(3 * Mp + M) + 0.00002 * s(4 * Mp);
    const A = [[299.77 + 0.107408 * k - 0.009173 * T * T, 0.000325], [251.88 + 0.016321 * k, 0.000165], [251.83 + 26.651886 * k, 0.000164], [349.42 + 36.412478 * k, 0.000126], [84.66 + 18.206239 * k, 0.00011], [141.74 + 53.303771 * k, 0.000062], [207.14 + 2.453732 * k, 0.00006]];
    for (const [a, c] of A) jde += c * s(a * R);
    return jde;
  }
  const jstDayOfJde = jde => Math.floor(((jde - 2440587.5) * 86400 - 70 + 9 * 3600) / 86400);

  const cache = new Map();
  function lunarMonths(year) {
    if (cache.has(year)) return cache.get(year);
    const start = num(year - 1, 10, 1), end = num(year + 1, 4, 1);
    let k = Math.floor((jdMidnight(start) - 2451550.09766) / 29.530588861);
    const starts = [];
    for (;;) {
      const d = jstDayOfJde(newMoonJde(k));
      if (d > end) break;
      if (d >= start) starts.push(d);
      k++;
    }
    const out = [];
    for (let i = 0; i < starts.length - 1; i++) {
      const a = sunLon(jdMidnight(starts[i])), b = sunLon(jdMidnight(starts[i + 1]));
      const b2 = b < a ? b + 360 : b;
      let z = null;
      for (let n = 0; n < 12; n++) {
        const L = n * 30, L2 = L <= a ? L + 360 : L;
        if (a < L2 && L2 <= b2) { z = L; break; }
      }
      if (z === null) out.push([starts[i], out.length ? out[out.length - 1][1] : 1, true]);
      else out.push([starts[i], (Math.floor(z / 30) + 2) % 12 || 12, false]);
    }
    cache.set(year, out);
    return out;
  }
  function lunar(n) {
    const months = lunarMonths(parts(n).y);
    const cur = months.filter(m => m[0] <= n).pop();
    return { month: cur[1], day: n - cur[0] + 1, leap: cur[2] };
  }
  const rokuyo = n => { const l = lunar(n); return ROKUYO[(l.month + l.day) % 6]; };

  function baseHoliday(n) {
    const { y, m, d, w } = parts(n);
    const fixed = { "1-1": "元日", "2-11": "建国記念の日", "2-23": "天皇誕生日", "4-29": "昭和の日", "5-3": "憲法記念日", "5-4": "みどりの日", "5-5": "こどもの日", "8-11": "山の日", "11-3": "文化の日", "11-23": "勤労感謝の日" };
    if (fixed[`${m}-${d}`]) return fixed[`${m}-${d}`];
    if (w === 1) {
      const nth = Math.floor((d - 1) / 7) + 1, key = `${m}-${nth}`;
      const happy = { "1-2": "成人の日", "7-3": "海の日", "9-3": "敬老の日", "10-2": "スポーツの日" };
      if (happy[key]) return happy[key];
    }
    const k = y - 1980, leap = Math.floor(k / 4);
    if (m === 3 && d === Math.trunc(20.8431 + 0.242194 * k - leap)) return "春分の日";
    if (m === 9 && d === Math.trunc(23.2488 + 0.242194 * k - leap)) return "秋分の日";
    return null;
  }
  function holiday(n) {
    const b = baseHoliday(n);
    if (b) return b;
    if (parts(n).w !== 0) {
      let back = n - 1;
      while (baseHoliday(back)) { if (parts(back).w === 0) return "振替休日"; back--; }
      if (baseHoliday(n - 1) && baseHoliday(n + 1)) return "国民の休日";
    }
    return null;
  }
  // 簡易な式では節気の瞬間が午前0時の反対側に出る3件を、精密な暦の値に合わせて補正する（README 参照）
  const LON_FIX = { [num(2023, 1, 6)]: -0.01, [num(2023, 6, 22)]: 0.01, [num(2031, 11, 8)]: -0.01 };
  const lonAt = n => sunLon(jdMidnight(n)) + (LON_FIX[n] || 0);
  function sekki(n) {
    const a = lonAt(n), b = lonAt(n + 1), b2 = b < a ? b + 360 : b;
    for (const key of Object.keys(SEKKI)) {
      const L = Number(key), L2 = L <= a ? L + 360 : L;
      if (a < L2 && L2 <= b2) return SEKKI[key];
    }
    return null;
  }
  const sekkiMonth = n => Math.floor(mod(lonAt(n + 1) - 315, 360) / 30) + 1;
  const eto = n => { const i = mod(n + 2440588 + 49, 60); return KAN[i % 10] + SHI[i % 12]; };
  const isIchiryu = n => ICHIRYU[sekkiMonth(n)].includes(eto(n)[1]);
  const isTensha = n => eto(n) === ["戊寅", "甲午", "戊申", "甲子"][Math.floor((sekkiMonth(n) - 1) / 3)];

  // 対応範囲の外と、存在しない日付（2月30日など）は黙って丸めず、例外にする
  function checkMonth(y, m) {
    if (!Number.isInteger(y) || !Number.isInteger(m)) throw new TypeError("year and month must be integers");
    if (y < MIN_YEAR || y > MAX_YEAR) throw new RangeError(`year must be between ${MIN_YEAR} and ${MAX_YEAR}: ${y}`);
    if (m < 1 || m > 12) throw new RangeError(`month must be between 1 and 12: ${m}`);
  }
  function info(y, m, d) {
    checkMonth(y, m);
    if (!Number.isInteger(d)) throw new TypeError("day must be an integer");
    const n = num(y, m, d), p = parts(n);
    if (p.m !== m || p.d !== d) throw new RangeError(`no such date: ${y}-${m}-${d}`);
    const l = lunar(n);
    return { y: p.y, m: p.m, d: p.d, week: WEEK[p.w], w: p.w, rokuyo: rokuyo(n), holiday: holiday(n), sekki: sekki(n), eto: eto(n), ichiryu: isIchiryu(n), tensha: isTensha(n), lunar: `${l.leap ? "閏" : ""}${l.month}月${l.day}日` };
  }
  function month(y, m) {
    checkMonth(y, m);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate(), out = [];
    for (let d = 1; d <= last; d++) out.push(info(y, m, d));
    return out;
  }
  const api = Object.freeze({ ROKUYO, MIN_YEAR, MAX_YEAR, info, month });
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Koyomi = api;
})(typeof window !== "undefined" ? window : globalThis);
