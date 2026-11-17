import type { Lesson } from "./schema";
import { a09 } from "./lessons/a09-network-layers";
import { a10 } from "./lessons/a10-ip-subnet";
import { a11 } from "./lessons/a11-devices";
import { a12 } from "./lessons/a12-packets";
import { a14 } from "./lessons/a14-tcp";
import { a13 } from "./lessons/a13-dns";

/** 路线 A 单元 A3（网络）的课时，单独放一个文件，方便与其他路线的改动合并。 */
export const networkLessons: Lesson[] = [a09, a10, a11, a12, a13, a14];
