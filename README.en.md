# koyomi-jp

[日本語](README.md)

A small, dependency-free JavaScript library for the Japanese calendar. Give it a date and it returns the rokuyo, national holiday, solar term, sexagenary cycle (eto), ichiryu-manbai-bi, tensha-nichi and lunisolar date. It makes no network calls and does not depend on the device's time zone.

Supported range: **January 1, 2022 to December 31, 2032.**

## Usage

Place this folder in your project and load it (it is not published on npm).

```js
// CommonJS
const koyomi = require("./koyomi-jp/koyomi.js");

const day = koyomi.info(2026, 11, 3);
console.log(day.rokuyo);  // "友引"
console.log(day.holiday); // "文化の日"
console.log(day.lunar);   // "9月24日"

// Find taian (大安) days on weekends and holidays in June 2027
const days = koyomi.month(2027, 6).filter(
  (x) => x.rokuyo === "大安" && (x.w === 0 || x.w === 6 || x.holiday)
);
console.log(days.map((x) => `${x.m}/${x.d}`)); // [ "6/5" ]
```

```js
// ES Modules
import { info, month } from "./koyomi-jp/koyomi.mjs";
```

```html
<!-- Browser: available as window.Koyomi -->
<script src="koyomi.js"></script>
<script>console.log(Koyomi.info(2026, 1, 1).holiday);</script>
```

A runnable example is in `examples/basic.js` (`node examples/basic.js`).

## API

| Name | Description |
|---|---|
| `info(year, month, day)` | Returns one day's information. The date is read as a calendar date in Japan |
| `month(year, month)` | Returns an array with every day of the month |
| `ROKUYO` | The rokuyo names, indexed by (lunar month + lunar day) mod 6 |
| `MIN_YEAR` / `MAX_YEAR` | First and last supported years (2022, 2032) |

Years outside the range and dates that do not exist (such as February 30) throw `RangeError`. Non-integer arguments throw `TypeError`. The library never silently returns a value for an unsupported date.

`info` returns the following. Text values are in Japanese.

| Field | Meaning | Example |
|---|---|---|
| `y` `m` `d` | Year, month, day | `2026` `11` `3` |
| `week` / `w` | Day of the week, and its number (0 = Sunday) | `"火"` / `2` |
| `rokuyo` | Rokuyo | `"友引"` |
| `holiday` | Holiday name, or `null` | `"文化の日"` |
| `sekki` | Solar term starting that day, or `null` | `"立冬"` |
| `eto` | Sexagenary cycle of the day | `"辛巳"` |
| `ichiryu` | Whether it is ichiryu-manbai-bi | `false` |
| `tensha` | Whether it is tensha-nichi | `false` |
| `lunar` | Lunisolar date; leap months start with 閏 | `"9月24日"`, `"閏2月1日"` |

## Things you should know

### Rokuyo and similar days are folklore

Rokuyo, ichiryu-manbai-bi and tensha-nichi are traditional beliefs with **no scientific basis**. Nothing here suggests that a "lucky" day improves any outcome or makes money grow. Almanacs also differ slightly on ichiryu-manbai-bi and tensha-nichi.

### Only 2022-2032 is supported, because of the 2033 problem

The lunisolar calendar here starts each month on the day of the new moon and numbers it by the principal solar term (chuki) it contains. From autumn 2033 to spring 2034 this rule alone cannot determine the month numbers. This is known as the **lunisolar 2033 problem**, so the library stops at 2032, before the years it cannot vouch for. Years before 2022 are excluded too: there is no comparison data for them, and the special holiday moves up to 2021 are not handled.

### Holidays in future years are predictions

Holidays are computed from the current National Holidays Act. **Law changes and one-off exceptions are not reflected.** The vernal and autumnal equinox days are officially announced only in February of the preceding year, so for later years the result is a prediction. Check the Cabinet Office's announcements before relying on a date for planning or business.

### Solar term accuracy

The sun's position uses a simplified formula, accurate to about 0.01 degrees or roughly 15 minutes. Three dates that this error would shift are corrected to match precise ephemeris values:

| Solar term | Corrected date | Moment (Japan time) | Source |
|---|---|---|---|
| 小寒 | 2023-01-06 | 00:05 | NAOJ Rekiyo |
| 夏至 | 2023-06-21 | 23:58 | NAOJ Rekiyo |
| 立冬 | 2031-11-08 | about 00:05 | Computed with NASA JPL Horizons |

**The 2030 雨水 date cannot be stated with certainty.** The computed moment is 23:59:57 on February 18, about 3 seconds before midnight. Future variation in the Earth's rotation can move it across midnight, so the February 18 returned here may differ from the official calendar.

Solar terms such as 小寒, 大雪, 芒種 and 立冬 also act as month boundaries, so their dates affect the neighboring ichiryu-manbai-bi and tensha-nichi.

## Some solar term dates may be off by one day

The sun's position uses a simplified formula, accurate to about 0.01 degrees or roughly 15 minutes. When a solar term falls close to midnight in Japan, the date may differ by one day from published calendars:

| Solar term | Date returned | Computed distance from midnight |
|---|---|---|
| 小寒 | 2023-01-05 | 3.4 min |
| 夏至 | 2023-06-22 | 3.7 min |
| 処暑 | 2024-08-22 | 8.8 min |
| 大雪 | 2024-12-07 | 15.6 min |
| 冬至 | 2025-12-22 | 1.7 min |
| 雨水 | 2030-02-18 | 0.8 min |
| 芒種 | 2030-06-05 | 13.6 min |
| 立冬 | 2031-11-07 | 4.6 min |

- The 2023 June solstice is reported at about 14:57 UTC on June 21, which is 23:57 on June 21 in Japan, so the 2023-06-22 returned here is probably wrong. It is left as is because the formula has been kept unchanged from the original.
- 小寒, 大雪, 芒種 and 立冬 start a solar month, so ichiryu-manbai-bi and tensha-nichi on the adjacent days may change as well.
- None of these dates is next to a new moon day, so the difference does not affect the lunisolar date or rokuyo.

## How it is calculated

- **Lunisolar date and rokuyo**: the day of the new moon in Japan Standard Time is day 1, and each month is numbered by the principal solar term it contains. Rokuyo is (lunar month + lunar day) mod 6.
- **Solar terms**: the day the sun's ecliptic longitude crosses a multiple of 15 degrees.
- **Eto**: a 60-day cycle.
- **Ichiryu-manbai-bi**: the solar month combined with the day's earthly branch.
- **Tensha-nichi**: the season by solar terms combined with the day's sexagenary cycle.

The new moon and solar position formulas are based on Jean Meeus, *Astronomical Algorithms*.

## Tests

```sh
npm test
```

There is nothing to install. It is expected to work on Node.js 18 or later (only v24 has been tried).

The tests compare all 4,018 days from 2022 to 2032 with `test/koyomi-golden.json`. That table is the output of a Python version using the same method, plus the three corrections above. It catches porting mistakes, but not errors in the method itself.

Checked against outside sources:

- Solar terms: all 48 in 2026 and 2027 have the same dates as the NAOJ Rekiyo.
- Solar terms: terms within about 40 minutes of midnight in 2022-2032 were compared with NASA JPL Horizons. For the 5 with a readable Rekiyo entry, Horizons and the Rekiyo agree to the minute.
- Rokuyo, lunisolar dates and holidays have not been checked day by day. For uses that need accuracy, confirm against official sources.

## How this was made

This library was built together with AI (Claude).

## License

[MIT](LICENSE) © temoto-dougu
