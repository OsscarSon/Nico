import { choose, type Pair } from "./math";

export const sum = (items: readonly number[]) => items.reduce((result, item) => result+item,0);
export const average = (items: readonly number[]) => sum(items)/items.length;
export function quantile(items: readonly number[],p: number) {
  const ordered=[...items].sort((a,b)=>a-b);
  const index=(ordered.length-1)*p, left=Math.floor(index);
  return ordered[left]!+(index-left)*(ordered[Math.ceil(index)]!-ordered[left]!);
}
export function sampleVariance(items: readonly number[]) {
  const mean=average(items);
  return sum(items.map(value=>(value-mean)**2))/(items.length-1);
}
export function describe(items: readonly number[]) {
  const count=new Map<number,number>();
  for (const value of items) count.set(value,(count.get(value)??0)+1);
  const frequency=Math.max(...count.values());
  const q1=quantile(items,.25),q3=quantile(items,.75),iqr=q3-q1;
  return { size:items.length,mean:average(items),median:quantile(items,.5),modes:[...count].filter(([,n])=>n===frequency).map(([value])=>value),
    sd:Math.sqrt(sampleVariance(items)),q1,q3,iqr,outliers:items.filter(item=>item<q1-1.5*iqr || item>q3+1.5*iqr) };
}

export function bayes(p: number, sensitivity: number, falsePositive: number) {
  const joint=p*sensitivity, positive=joint+(1-p)*falsePositive;
  return { positive, posterior:positive ? joint/positive : null };
}
export function regression(pairs: readonly Pair[]) {
  const x=average(pairs.map(([a])=>a)),y=average(pairs.map(([,b])=>b));
  const xx=sum(pairs.map(([a])=>(a-x)**2)),xy=sum(pairs.map(([a,b])=>(a-x)*(b-y))), yy=sum(pairs.map(([,b])=>(b-y)**2));
  if (xx===0) return null;
  const slope=xy/xx, intercept=y-slope*x;
  return { slope,intercept,r:yy ? xy/Math.sqrt(xx*yy) : null, residuals:pairs.map(([a,b])=>b-(intercept+slope*a)) };
}

export const binomial = (n: number, p: number, k: number) => k>n ? 0 : choose(n,k)*p**k*(1-p)**(n-k);
export function poisson(rate: number,k: number) {
  let probability=Math.exp(-rate);
  for (let i=1;i<=k;i++) probability*=rate/i;
  return probability;
}
// Standard normal survival approximation; absolute error < 8e-8 (A&S 26.2.17).
export function normalTail(z: number): number {
  if (z<0) return 1-normalTail(-z);
  const t=1/(1+.2316419*z);
  return Math.exp(-z*z/2)/Math.sqrt(2*Math.PI)*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
}
export function proportions(nA: number,xA: number,nB: number,xB: number) {
  if (![nA,xA,nB,xB].every(Number.isInteger) || nA<=0 || nB<=0 || xA<0 || xB<0 || xA>nA || xB>nB) return null;
  const a=xA/nA,b=xB/nB,difference=b-a,pooled=(xA+xB)/(nA+nB);
  const approx=Math.min(nA*pooled,nA*(1-pooled),nB*pooled,nB*(1-pooled),xA,nA-xA,xB,nB-xB)>=10;
  const se=Math.sqrt(a*(1-a)/nA+b*(1-b)/nB);
  const z=approx ? difference/Math.sqrt(pooled*(1-pooled)*(1/nA+1/nB)) : null;
  const ci: Pair|null = approx ? [difference-1.959964*se,difference+1.959964*se] : null;
  return {a,b,difference,approx,z,p:z===null ? null : 2*normalTail(Math.abs(z)),ci};
}
export function welch(a: readonly number[],b: readonly number[]) {
  const u=sampleVariance(a)/a.length,v=sampleVariance(b)/b.length;
  return u+v===0 ? null : { t:(average(b)-average(a))/Math.sqrt(u+v),df:(u+v)**2/(u*u/(a.length-1)+v*v/(b.length-1)) };
}
export function chiSquare2x2(cells: readonly [number,number,number,number]) {
  const [a,b,c,d]=cells,total=sum(cells);
  const expected=[(a+b)*(a+c),(a+b)*(b+d),(c+d)*(a+c),(c+d)*(b+d)].map(product=>product/total);
  if (!expected.every(x=>Number.isFinite(x)&&x>0)) return null;
  return { expected, stat:sum(cells.map((value,i)=>(value-expected[i]!)**2/expected[i]!)) };
}
export function anova(groups: readonly (readonly number[])[]) {
  const flat=groups.flat(),overall=average(flat),between=sum(groups.map(group=>group.length*(average(group)-overall)**2));
  const within=sum(groups.map(group=>sum(group.map(x=>(x-average(group))**2))));
  return { between,within,f:within ? (between/(groups.length-1))/(within/(flat.length-groups.length)) : null };
}
export const mannWhitney = (a: readonly number[], b: readonly number[]) =>
  sum(a.map(a=>sum(b.map(b=>a>b ? 1 : a===b ? .5 : 0))));

export function treeProbabilities(prior:number, hit:number, falseAlarm:number) {
  if (![prior,hit,falseAlarm].every(value=>Number.isFinite(value)&&value>=0&&value<=1)) {
    throw new RangeError("所有概率必须介于 0 与 1。");
  }
  const trueAlert=prior*hit, falseAlert=(1-prior)*falseAlarm;
  const positive=trueAlert+falseAlert;
  return {trueAlert,falseAlert,positive,posterior:positive>0?trueAlert/positive:null};
}
