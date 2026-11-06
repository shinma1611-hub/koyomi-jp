// import { info } from "koyomi-jp" で使うための入口。計算の本体は koyomi.js
import koyomi from "./koyomi.js";
export const { ROKUYO, MIN_YEAR, MAX_YEAR, info, month } = koyomi;
export default koyomi;
