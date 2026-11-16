import type { Lesson } from "./schema";
import { b01 } from "./lessons/b01-variables";
import { b02 } from "./lessons/b02-conditions";
import { b03 } from "./lessons/b03-loops";
import { b04 } from "./lessons/b04-functions";
import { b05 } from "./lessons/b05-lists";
import { b06 } from "./lessons/b06-dicts";
import { b07 } from "./lessons/b07-debugging";
import { b08 } from "./lessons/b08-html";
import { b09 } from "./lessons/b09-css";
import { b10 } from "./lessons/b10-css-layout";
import { b11 } from "./lessons/b11-js-dom";
import { b12 } from "./lessons/b12-events";

/** 路线 B 的课时。新增课时：写文件、在这里加一行、把 track-b-catalog.ts 里对应条目改为 available。 */
export const trackBLessons: Lesson[] = [b01, b02, b03, b04, b05, b06, b07, b08, b09, b10, b11, b12];
