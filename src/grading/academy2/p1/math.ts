export type Pair = readonly [number, number];
export type Matrix = readonly [Pair, Pair];
export const dot = (a: Pair,b: Pair) => a[0]*b[0]+a[1]*b[1];
export const apply = (matrix: Matrix, v: Pair): Pair => [dot(matrix[0],v),dot(matrix[1],v)];
export const determinant = ([[a,b],[c,d]]: Matrix) => a*d-b*c;
export function quadratic(a: number,b: number,c: number) {
  const discriminant = b*b-4*a*c;
  const roots = !a ? (b ? [-c/b] : []) : discriminant < 0 ? [] :
    discriminant === 0 ? [-b/(2*a)] : [(-b-Math.sqrt(discriminant))/(2*a),(-b+Math.sqrt(discriminant))/(2*a)].sort((x,y)=>x-y);
  const x = a ? -b/(2*a) : 0;
  return { roots, vertex: a ? [x,(a*x+b)*x+c] as Pair : null, constant: a===0 && b===0 };
}
export function analyzeMatrix(matrix: Matrix) {
  const [[a,b],[c,d]] = matrix;
  const det = determinant(matrix), trace = a+d, discriminant = trace*trace-4*det;
  const diagonal = a*a+b*b+c*c+d*d;
  const high = Math.sqrt((diagonal+Math.sqrt(Math.max(0,diagonal*diagonal-4*det*det)))/2);
  const low = high === 0 ? 0 : Math.abs(det)/high;
  return {
    det, rank: high === 0 ? 0 : low <= 2*Number.EPSILON*high ? 1 : 2,
    realEigen: discriminant >= 0 ? [(trace+Math.sqrt(discriminant))/2,(trace-Math.sqrt(discriminant))/2] : [],
    singular: [high, low],
  };
}
export function gcd(a: number,b: number) {
  let x=Math.abs(a),y=Math.abs(b);
  while (y !== 0) { [x,y] = [y,x%y]; }
  return x;
}
export function shortestPath(edges: readonly (readonly [string,string])[], start: string, end: string) {
  const seen = new Set([start]);
  const queue = [[start]];
  for (let index=0;index<queue.length;index++) {
    const path=queue[index]!, last=path.at(-1)!;
    if (last === end) return path;
    for (const [a,b] of edges) {
      const neighbor=last===a ? b : last===b ? a : null;
      if (neighbor !== null && !seen.has(neighbor)) { seen.add(neighbor); queue.push([...path,neighbor]); }
    }
  }
  return null;
}
export function choose(n: number,k: number) {
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || n < k) return 0;
  let result=1;
  const count=Math.min(k,n-k);
  for (let i=1;i<=count;i++) result=result*(n-count+i)/i;
  return Math.round(result);
}
export function calculus(x: number, y: number, step: number) {
  const f=(a: number,b: number)=>a*a+2*b*b;
  const grad = [2*x,4*y] as const;
  const next = [x-step*grad[0],y-step*grad[1]] as const;
  const h=.0001;
  const limitSlope=((x+h)**2-x*x)/h;
  let integral=0;
  const width=x/40;
  for (let i=0;i<40;i++) integral+=width*((i*width)**2+((i+1)*width)**2)/2;
  return { value:f(x,y), gradient:grad, next,nextValue:f(...next), limitSlope,integral, integralExact:x**3/3 };
}
