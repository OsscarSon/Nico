import type { Pair } from "../../../grading/academy2/p1/math";
export type Output = { values: readonly (readonly [string, string | number])[]; plot?: {kind: "line" | "points" | "bars"; points: readonly Pair[] }; source?: string };
export type Field = { name: string; initial: string; hint?: string };
export type Bench = {
  title: string; intro: string; fields: Field[]; run: (values: string[]) => Output;
  scratch: string; library: string;
  sources: readonly (readonly [string,string])[];
};
export const field = (name: string, initial: string | number, hint?: string): Field => ({name, initial:String(initial),hint});
export const toNumber = (raw: string | undefined, min=-1e5, max=1e5) => {
  const value=Number(raw);
  if (!raw?.trim() || !Number.isFinite(value) || value<min || value>max) throw Error("请输入 " + min + " 到 " + max + " 的有效数值。");
  return value;
};
export function integer(raw: string | undefined,min=0,max=10000) {
  const value=toNumber(raw,min,max);
  if (!Number.isInteger(value)) throw Error("这个输入需要整数。");
  return value;
}
export function numberList(raw: string | undefined,min=2,max=50) {
  const list=raw?.trim().split(/[，,\s]+/) ?? [];
  if (list.length<min || list.length>max) throw Error("请提供 " + min + " 至 " + max + " 个数值，以逗号或空格分开。");
  return list.map(value=>toNumber(value));
}
export function pairList(raw: string | undefined): Pair[] {
  const values=raw?.split(/[;；]/) ?? [];
  if (values.length<2 || values.length>50) throw Error("请提供 2 至 50 对 x,y；每对之间用分号。");
  return values.map(value => {
    const pair=numberList(value,2,2);
    return [pair[0]!,pair[1]!];
  });
}
export function graphEdges(raw: string | undefined): PairOfStrings[] {
  const values=raw?.trim().split(/[，,\s]+/) ?? [];
  if (!values.length || values.length>20 || values.some(item=>!/^([A-Z])-([A-Z])$/.test(item) || item[0]===item[2])) throw Error("用 A-B,B-C 表示最多二十条无向边，顶点为大写字母。");
  return values.map(edge=>[edge[0]!,edge[2]!]);
}
type PairOfStrings = readonly [string,string];
export const display = (value: number | null) => value===null ? "无定义或条件不足" : Number(value.toPrecision(7)).toString();
export const output = (values: Output["values"], plot?: Output["plot"]): Output => ({ values,plot });
export const fmSources = [
 ["OpenStax · College Algebra 2e","https://openstax.org/details/books/college-algebra-2e"],
 ["MIT OCW · Mathematics for Computer Science","https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/"],
] as const;
export const fsSources = [
 ["OpenIntro Statistics","https://www.openintro.org/book/os/"],
 ["UC Berkeley Data 8 · Computational and Inferential Thinking","https://inferentialthinking.com/chapters/intro.html"],
] as const;
export const imSources = [
 ["MIT OCW · Linear Algebra 18.06","https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/"],
 ["MIT OCW · Multivariable Calculus","https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/"],
 ["MIT OCW · Mathematics for Computer Science","https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/"],
] as const;
export const isSources = [
 ["MIT OCW · Introduction to Probability and Statistics","https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/"],
 ["MIT OCW · Statistics for Applications","https://ocw.mit.edu/courses/18-650-statistics-for-applications-fall-2016/"],
] as const;
