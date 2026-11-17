import type { Lesson } from "./schema";
import { a18 } from "./lessons/a18-passwords";
import { a19 } from "./lessons/a19-phishing";
import { a20 } from "./lessons/a20-least-privilege";
/** Existing Foundation A4 IDs; draft content, not learner-approved quality. */
export const securityLessons: Lesson[] = [a18, a19, a20];
