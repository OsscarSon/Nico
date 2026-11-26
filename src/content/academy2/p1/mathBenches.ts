import { analyzeMatrix, apply, calculus, dot, gcd, quadratic, shortestPath, type Matrix, type Pair } from "../../../grading/academy2/p1/math";
import { samplePolynomial } from "../../../grading/academy2/labs";
import { display, field, fmSources, graphEdges, imSources, integer, numberList, output, toNumber, type Bench } from "./workbench";

export const polynomialFields = [field("二次项 a",1),field("一次项 b",-4),field("常数 c",3)];
export function polynomialOutput(values: string[]) {
  const [a,b,c]=values.slice(0,3).map(value=>toNumber(value,-20,20)) as [number,number,number];
  const graph=quadratic(a,b,c);
  return output([
    ["模型", "y = " + a + "x² + (" + b + ")x + (" + c + ")"],
    ["实零点",graph.constant && !c ? "所有实数" : graph.roots.length ? graph.roots.map(display).join(", ") : "无"],
    ["顶点",graph.vertex?.map(display).join(", ") ?? "无（二次项为 0）"],
    ["y 截距",c],
  ],{kind:"line",points:samplePolynomial(a,b,c).map(({x,y})=>[x,y] as const)});
}
export const polynomialLibrary = `import numpy as np
from numpy.polynomial import Polynomial
p = Polynomial([3, -4, 1])  # 常数放在前面
print(np.sort(p.roots()), p(2), p.deriv()(2))
# [1. 3.] -1.0 0.0`;
export const mathBenches: Record<string,Bench> = {
 "foundation-mathematics/algebra":{
  title:"集合、等式和不等式",intro:"先手算去重后的交集。把一次项系数改成负数，再观察方程的解与不等式的翻转。",
  fields:[field("集合 A","1,2,3,3"),field("集合 B","2,4,6"),field("系数 a",2),field("比较值 c",6)],
  run:([left,right,a,c])=>{
    const A=new Set(numberList(left,1)),B=new Set(numberList(right,1));
    const coeff=toNumber(a),limit=toNumber(c);
    return output([["交集",[...A].filter(item=>B.has(item)).join(", ")||"∅"],["并集大小",new Set([...A,...B]).size],["ax=c",coeff ? display(limit/coeff) : limit===0 ? "所有实数":"无解"],["ax≤c",coeff ? (coeff>0 ? "x≤":"x≥")+display(limit/coeff) : limit>=0 ? "所有实数":"无解"]]);
  },
  scratch:`const intersection = [...A].filter(x => B.has(x));
const endpoint = c / a;  // a 不能为零
const direction = a > 0 ? "≤" : "≥";`,
  library:`import sympy as s
x = s.symbols("x", real=True)
A, B = s.FiniteSet(1, 2, 3), s.FiniteSet(2, 4, 6)
print(A.intersect(B), len(A.union(B)))
print(s.solve_univariate_inequality(2*x <= 6, x))
# {2}, 5, x <= 3`,sources:fmSources},
 "foundation-mathematics/functions":{
  title:"函数、顶点与零点",intro:"观察系数怎样改变曲线。令 a=0 得到一次函数，再比较图像何时是单射。图示横轴范围 −5 到 5。",
  fields:polynomialFields,run:polynomialOutput,
  scratch:`const value = (a*x+b)*x+c;  // Horner
const D = b*b-4*a*c;
const vertexX = -b/(2*a);  // a 非零`,library:polynomialLibrary,sources:fmSources},
 "foundation-mathematics/vectors":{
  title:"向量、三角函数与旋转",intro:"用度数选择旋转矩阵。查看旋转前后长度、点积，以及垂直或反向的结果。",
  fields:[field("第一坐标 x",3),field("第二坐标 y",4),field("旋转角度（度）",90)],
  run:([x,y,angle])=>{
    const original: Pair=[toNumber(x),toNumber(y)],theta=toNumber(angle,-360,360)*Math.PI/180;
    const cos=Math.cos(theta),sin=Math.sin(theta),rotated=apply([[cos,-sin],[sin,cos]],original);
    return output([["cos θ",display(cos)],["sin θ",display(sin)],["旋转结果",rotated.map(x=>display(Math.abs(x)<1e-12 ? 0:x)).join(", ")],["旋转前长度",display(Math.hypot(...original))],["旋转后长度",display(Math.hypot(...rotated))],["两个向量的点积",display(dot(original,rotated))]],{kind:"points",points:[[0,0],original,rotated]});
  },
  scratch:`const theta = degrees*Math.PI/180;
const turned = [Math.cos(theta)*x-Math.sin(theta)*y,
                 Math.sin(theta)*x+Math.cos(theta)*y];`,
  library:`import numpy as np
a=np.deg2rad(90)
R=np.array([[np.cos(a),-np.sin(a)],[np.sin(a),np.cos(a)]])
v=np.array([3,4]); w=R @ v
print(np.round(w,6), np.linalg.norm(w), round(v @ w,6))
# [-4. 3.] 5.0 0.0`,sources:fmSources},
 "foundation-mathematics/proof":{
  title:"真值表与有限反例搜索",intro:"比较蕴含和逆命题。程序只在指定范围找反例；要证明所有整数，仍须写出任意整数形式。",
  fields:[field("从 −n 到 n 枚举，n",8)],
  run:([n])=>{
    const size=integer(n,0,30),tested=Array.from({length:2*size+1},(_,i)=>i-size);
    const converse=tested.find(x=>x%2===0&&x%4!==0);
    return output([["P⇒Q 四种输入（00,01,10,11）",[false,true].flatMap(p=>[false,true].map(q=>!p||q ? "真":"假")).join("、")],["测试的整数个数",tested.length],["“偶数必被 4 整除”的反例",converse ?? "当前区间未找到"],["连续两整数乘积的奇数反例数",tested.filter(x=>x*(x+1)%2!==0).length]]);
  },
  scratch:`const implies = (p,q) => !p || q;
const witness = values.find(n => n%2 === 0 && n%4 !== 0);`,
  library:`import sympy as s
p,q=s.symbols("p q")
print(s.simplify_logic(s.Implies(p,q)))
print(next(n for n in range(-8,9) if n%2==0 and n%4!=0))
# q | ~p, -6`,sources:fmSources},
 "intermediate-mathematics/linear-algebra":{
  title:"矩阵、秩、特征值和 SVD",intro:"替换四个元素，比较缩放、剪切、秩亏和旋转。SVD 的奇异值描述长度倍率，特征值可能为复数。",
  fields:[field("a₁₁",3),field("a₁₂",0),field("a₂₁",0),field("a₂₂",-2),field("测试向量 x,y","1,1")],
  run:([a,b,c,d,v])=>{
    const A: Matrix=[[toNumber(a),toNumber(b)],[toNumber(c),toNumber(d)]],u=numberList(v,2,2) as [number,number];
    const s=analyzeMatrix(A),Au=apply(A,u);
    return output([["det A",display(s.det)],["数值秩",s.rank],["实特征值",s.realEigen.map(display).join(", ")||"无实特征值"],["前两个奇异值",s.singular.map(display).join(", ")],["Av",Au.map(display).join(", ")]],{kind:"points",points:[[0,0],u,Au,[A[0][0],A[1][0]],[A[0][1],A[1][1]]]});
  },
  scratch:`const determinant = a*d-b*c;
const traceAtA = a*a+b*b+c*c+d*d;
const high = Math.sqrt((traceAtA + Math.sqrt(traceAtA**2-4*determinant**2))/2);`,
  library:`import numpy as np
A=np.diag([3,-2])
print(np.linalg.det(A), np.linalg.matrix_rank(A))
print(np.linalg.eigvals(A), np.linalg.svd(A,compute_uv=False))
print(A @ [1,1])
# -6（浮点舍入）, 2, [3,-2], [3,2], [3,-2]`,sources:imSources},
 "intermediate-mathematics/calculus":{
  title:"差商、梯形积分和梯度下降",intro:"用 f(x,y)=x²+2y²，比较精确偏导、有限差分、积分与梯度更新。把步长设得过大，看目标是否下降。",
  fields:[field("起点 x",2),field("起点 y",1),field("梯度步长",.1)],
  run:([x,y,step])=>{
    const a=toNumber(x,-10,10),b=toNumber(y,-10,10),alpha=toNumber(step,0,2),result=calculus(a,b,alpha);
    return output([["f(x,y)",display(result.value)],["∇f",result.gradient.map(display).join(", ")],["x 的前向差商",display(result.limitSlope)],["∫₀ˣ t² dt 梯形值",display(result.integral)],["解析积分",display(result.integralExact)],["梯度更新后的点",result.next.map(display).join(", ")],["更新后 f",display(result.nextValue)],["Hessian","[[2,0],[0,4]]"],["Jacobian（映射 F=(x²+y,xy)）",`[[${2*a},1],[${b},${a}]]`]],{kind:"line",points:samplePolynomial(1,0,2*b*b).map(({x,y})=>[x,y] as const)});
  },
  scratch:`const gradient = [2*x, 4*y];
const next = [x-alpha*gradient[0], y-alpha*gradient[1]];
const finiteDifference = ((x+h)**2-x*x)/h;`,
  library:`import sympy as s
x,y=s.symbols("x y")
f=x*x+2*y*y
g=s.Matrix([s.diff(f,x),s.diff(f,y)])
print(g.subs({x:2,y:1}), s.hessian(f,(x,y)))
print(s.integrate(x*x, (x,0,2)))
# [4,4], diag(2,4), 8/3`,sources:imSources},
 "intermediate-mathematics/discrete":{
  title:"图遍历与整数余数",intro:"输入无向边，广度优先搜索逐层展开。再试两组整数观察 Euclid 余数如何使问题规模缩小。",
  fields:[field("无向图边","A-B,B-C,B-D,D-E"),field("起点","A"),field("终点","E"),field("第一个整数",252),field("第二个整数",105)],
  run:([raw,from,to,a,b])=>{
    const edges=graphEdges(raw),vertices=new Set(edges.flat());
    const start=from!.trim(),end=to!.trim();
    if (!vertices.has(start)||!vertices.has(end)) throw Error("起点与终点须是图中的顶点。");
    const path=shortestPath(edges,start,end);
    return output([["最短路径",path?.join(" → ") ?? "不可达"],["边数（距离）",path ? path.length-1 : "不可达"],["无向图度数总和",2*new Set(edges.map(edge=>[...edge].sort().join("-"))).size],["最大公因数",gcd(integer(a,-10000),integer(b,-10000))]]);
  },
  scratch:`while (b !== 0) [a,b] = [b,a%b];
// BFS 从起点入队，按 FIFO 逐层扫描；入队时标记已访问。`,
  library:`import math
import numpy as np
from scipy.sparse.csgraph import shortest_path
labels="ABCDE"; G=np.zeros((5,5))
for a,b in [("A","B"),("B","C"),("B","D"),("D","E")]:
    G[labels.index(a),labels.index(b)]=1
dist=shortest_path(G,directed=False,unweighted=True,indices=0)
print(dist[4], math.gcd(252,105))  # 3.0, 21`,sources:imSources},
};
