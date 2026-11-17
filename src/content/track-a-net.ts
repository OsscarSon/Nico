import type { Lesson } from "./schema";
import { a09 } from "./lessons/a09-network-layers";
import { a10 } from "./lessons/a10-ip-subnet";
import { a11 } from "./lessons/a11-devices";
import { a12 } from "./lessons/a12-packets";
import { a14 } from "./lessons/a14-tcp";
import { a13 } from "./lessons/a13-dns";

import { a15 } from "./lessons/a15-udp";
import { a16 } from "./lessons/a16-http-https";
import { a17 } from "./lessons/a17-web-journey";

/** 路线 A 单元 A3（网络）的课时，单独放一个文件，方便与其他路线的改动合并。 */
export const networkLessons: Lesson[] = [a09, a10, a11, a12, a13, a14, a15, a16, a17];
