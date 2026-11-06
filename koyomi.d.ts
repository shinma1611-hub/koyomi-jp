export type Rokuyo = "大安" | "赤口" | "先勝" | "友引" | "先負" | "仏滅";

export interface DayInfo {
  y: number;
  m: number;
  d: number;
  /** 曜日（日〜土） / Day of the week in Japanese */
  week: "日" | "月" | "火" | "水" | "木" | "金" | "土";
  /** 曜日の番号（0 = 日曜） / 0 = Sunday */
  w: number;
  rokuyo: Rokuyo;
  /** 祝日名。祝日でなければ null / Holiday name, or null */
  holiday: string | null;
  /** その日に始まる二十四節気。なければ null / Solar term starting that day, or null */
  sekki: string | null;
  /** 日の干支 / Sexagenary cycle of the day */
  eto: string;
  /** 一粒万倍日か / Ichiryu-manbai-bi */
  ichiryu: boolean;
  /** 天赦日か / Tensha-nichi */
  tensha: boolean;
  /** 旧暦（例：「閏2月1日」） / Lunisolar date, e.g. "閏2月1日" */
  lunar: string;
}

export const ROKUYO: readonly Rokuyo[];
export const MIN_YEAR: 2022;
export const MAX_YEAR: 2032;
export function info(year: number, month: number, day: number): DayInfo;
export function month(year: number, month: number): DayInfo[];

declare const koyomi: {
  ROKUYO: typeof ROKUYO;
  MIN_YEAR: typeof MIN_YEAR;
  MAX_YEAR: typeof MAX_YEAR;
  info: typeof info;
  month: typeof month;
};
export default koyomi;
