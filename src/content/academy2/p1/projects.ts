import { analyzeMatrix, apply, calculus, quadratic, shortestPath, type Matrix, type Pair } from "../../../grading/academy2/p1/math";
import { describe, proportions, regression } from "../../../grading/academy2/p1/statistics";
import { exercise, type Exercise } from "./types";
import { mathBenches, polynomialFields, polynomialOutput } from "./mathBenches";
import { abFields, abOutput, abPython, iris, irisFields, irisOutput, statBenches } from "./statBenches";
import { display, field, graphEdges, imSources, integer, isSources, output, toNumber, type Bench } from "./workbench";

export type Project = {
  bench: Bench; steps: readonly string[]; review: string; evidence: (settings: string[]) => readonly [Exercise, Exercise, Exercise];
};
const number=(question:string,value:number,reason:string)=>exercise(question,value,reason);
const withInitial = (fields: Bench["fields"], initial: string[]) =>
  fields.map((value,i)=>({...value,initial:initial[i] ?? value.initial}));

const graphFields=[field("无向边","A-B,B-C,C-D"),field("图起点","A"),field("图终点","D")];
const linear=mathBenches["intermediate-mathematics/linear-algebra"]!;
const diff=mathBenches["intermediate-mathematics/calculus"]!;
function crossMath(settings: string[]) {
  const [a,b,c,d,x,y,step,edges,start,end]=settings;
  const matrix:Matrix=[[toNumber(a,-20,20),toNumber(b,-20,20)],[toNumber(c,-20,20),toNumber(d,-20,20)]];
  const graph=graphEdges(edges),from=start!.trim(),to=end!.trim(),vertices=new Set(graph.flat());
  if (!vertices.has(from)||!vertices.has(to)) throw Error("起点与终点都应是图中的顶点。");
  const point:Pair=[toNumber(x,-10,10),toNumber(y,-10,10)];
  const alpha=toNumber(step,0,1);
  return { matrix, linear:analyzeMatrix(matrix), transformed:apply(matrix, point), initial:point, derivative:calculus(...point,alpha), path:shortestPath(graph,from,to) };
}

export const projectsP1: Record<string,Project> = {
 "foundation-mathematics":{
   bench:{...mathBenches["foundation-mathematics/functions"]!,title:"交互式函数与数学可视化实验室",
     intro:"先用图形观察，再用因式分解精确设计函数。每次运行保存系数和观察结果。",
     fields:withInitial(polynomialFields,["1","0","0"]),run:polynomialOutput},
   steps:[
     "从 y=x² 开始，记录顶点与零点。分别改变常数和一次项，比较曲线与坐标轴的交点。",
     "制作首项系数 1、两个实零点为 1 和 3 的二次函数。由因式 (x−1)(x−3) 决定系数，并运行核对。",
     "求轴的横坐标、顶点高度和 x=4 的函数值。用 NumPy Polynomial 独立核对，调整代码中的系数顺序。"
   ],review:"用自己的话说明三个系数分别如何影响图形，以及哪种变化不会改变开口方向。",
   evidence:values=>{
     const [a,b,c]=values.map(value=>toNumber(value,-20,20)) as [number,number,number];
     const shape=quadratic(a,b,c);
     if (!shape.vertex||a!==1||shape.roots[0]!==1||shape.roots[1]!==3) throw Error("先按任务配置二次函数，使 a=1 且有零点 1、3。");
     return [number("对称轴 x 的值",shape.vertex[0],"等于两零点均值。"),number("顶点的 y 值",shape.vertex[1],"代入函数。"),number("当 x=4，函数值",16*a+4*b+c,"在曲线上验证一个非根位置。")];
   },
 },
 "foundation-statistics":{
   bench:{...statBenches["foundation-statistics/visualization"]!,title:"真实数据统计分析报告",intro:"数据来自 UCI Iris 的 150 条测量，单位 cm。项目比较花萼长度与花瓣长度，按物种分组。",fields:irisFields,run:irisOutput},
   steps:[
     "记录数据单位、观察单位和来源。本数据三类各 50 株，样本设计限制了结果可以代表的总体。",
     "先运行 all，再在相同横、纵轴比较 setosa。至少记录样本数、中位数、标准差、IQR 与 Pearson r。散点和相关变化可能来自分组结构。",
     "把最终输出设为 setosa，横轴 1 花萼长、纵轴 3 花瓣长。完成三项数值证据并导出结果。用 NumPy 及 scikit-learn 复核分组，需按物种筛选。"
   ],review:"解释组内和汇总散点图是否回答同一问题。记录指标单位、至少一项限制，并避免因果断言。",
   evidence:([x,y,group])=>{
     if (integer(x,1,4)!==1||integer(y,1,4)!==3||group!.trim().toLowerCase()!=="setosa") throw Error("请切换到 setosa、横轴 1、纵轴 3 再开始验收。");
     const pairs:Pair[]=iris.filter(record=>record.species==="setosa").map(record=>[record.lengths[0]!,record.lengths[2]!]);
     return [number("setosa 原测量数据行数",pairs.length,"每一行只统计一次。"),
       number("花瓣长均值（cm）",describe(pairs.map(pair=>pair[1])).mean,"把实测花瓣长求和并除以样本量。"),
       number("横纵轴的组内 Pearson r（小数）",regression(pairs)!.r!,"使用配对的花萼、花瓣长度和该组均值。")];
   },
 },
 "intermediate-mathematics":{
   bench:{title:"矩阵、梯度与图论交互实验室",intro:"用一组输入对照线性变换、可微函数的局部更新与无向图的无权路径。",
     fields:[...linear.fields.slice(0,4),...diff.fields,...graphFields],
     run:settings=>{
       const item=crossMath(settings);
       return output([["det A",display(item.linear.det)],["A·(x,y)",item.transformed.map(display).join(", ")],["奇异值",item.linear.singular.map(display).join(", ")],
       ["梯度",item.derivative.gradient.join(", ")],["起始目标",display(item.derivative.value)],["更新后目标",display(item.derivative.nextValue)],
       ["BFS 最短路径",item.path?.join(" → ")??"不可达"],["边数",item.path ? item.path.length-1 : "不可达"]],
       {kind:"points",points:[[0,0],item.initial,item.transformed,item.derivative.next]});
     },
     scratch:`// 同一输入分别运行三个模型。
const transformed = A.map(row => row[0]*x+row[1]*y);
const next = [x-alpha*2*x,y-alpha*4*y];
// BFS 按边数扩展，入队时标记访问。`,
     library:`import numpy as np
from scipy.sparse.csgraph import shortest_path
A=np.diag([3,-2]); point=np.array([2,1])
new=point-.1*np.array([4,4])
g=np.zeros((4,4)); labels="ABCD"
for a,b in [("A","B"),("B","C"),("C","D"),("A","C")]:
    g[labels.index(a),labels.index(b)]=1
print(np.linalg.det(A), A@point, new@np.diag([1,2])@new)
print(shortest_path(g,directed=False,unweighted=True,indices=0)[3])`,sources:imSources},
   steps:[
     "尝试一个对角变换和一个非对角变换，比较行列式符号、奇异值及向量的像。",
     "从非零起点比较梯度下降步长 0.1 和 1.0。记录何时目标增加，根据计算说明为什么步长不能随意放大。",
     "为默认图补一条边，令 A 到 D 的最短距离恰为 2。最终保留 det(A)<0 的矩阵及能使正目标下降的步长，再向验收提交三个结果。"
   ],review:"说明三个索引或单位各自代表什么，并区分几何方向反转、数值下降和图的最短边数。",
   evidence:settings=>{
     const item=crossMath(settings);
     if (item.linear.det>=0||item.derivative.value<=item.derivative.nextValue||item.path?.length!==3) throw Error("需要 det(A)<0、梯度更新使目标下降，且最短路径为两条边。");
     return [number("行列式 det(A)",item.linear.det,"用 ad−bc，并保留方向符号。"),
      number("更新后的目标值",item.derivative.nextValue,"对更新后的 x,y 重新求值。"),
      number("最短路径的边数",item.path.length-1,"相邻顶点之间是一条边。")];
   },
 },
 "intermediate-statistics":{
   bench:{title:"设计并分析一次 A/B Test",intro:"使用教学计数对照两个比例。固定样本设计后，分别解释效果大小、双侧检验与区间。",
     fields:[...withInitial(abFields,["200","40","200","44"]),field("随机分配单位","访问", "输入 用户 或 访问")],
     run:settings=>{
       if (!["用户","访问"].includes(settings[4]!.trim())) throw Error("随机单位输入“用户”或“访问”。");
       const result=abOutput(settings);
       return {...result,values:[["分配单位",settings[4]!.trim()],...result.values]};
     },
     scratch:`const p = (xA+xB)/(nA+nB);
const z = (xB/nB-xA/nA) / Math.sqrt(p*(1-p)*(1/nA+1/nB));
// 区间采用未合并方差；检验使用零假设下的合并方差。`,
     library:abPython,sources:isSources},
   steps:[
     "预先写下双侧 H₀: pA=pB、α=.05，最小有意义差异 5 个百分点。这里以用户为独立单位，每人只入一组，指标为成功/失败。",
     "固定每组 200 名、A 组 40 名成功。先运行 B=44；再为教学场景设计一个 B 至少 56 名成功的可比较案例。查看计数断言和近似适用性。",
     "用 SciPy 核对双侧尾概率和 95% 区间。报告 B−A 的百分点、p 值和区间；区间跨越业务门槛时保留不确定性。"
   ],review:"说明随机化与独立性何时成立，解释效应和业务门槛。写出有显著与无显著结果都可以支持什么结论。",
   evidence:([a,xa,b,xb,unit])=>{
     const result=proportions(integer(a,1),integer(xa),integer(b,1),integer(xb));
     if (!result||!result.approx||unit!.trim()!=="用户"||Number(a)!==200||Number(b)!==200||Number(xa)!==40||Number(xb)<56) throw Error("按任务选用户分配，每组 200 人，A 有 40 次成功，B 至少 56 次成功。");
     return [number("B−A 差异（百分点）",result.difference*100,"以百分数相减，不使用相对百分比。"),
       number("双侧 p（小数）",result.p!,"合并零假设方差，取两个对称的尾。"),
       number("95% 区间的下限（百分点）",result.ci![0]*100,"使用两组各自比例的标准误。")];
   },
 },
};
