import records from "./data/iris.json";
import { sampleBernoulliDistribution } from "../../../grading/academy2/labs";
import { choose, type Pair } from "../../../grading/academy2/p1/math";
import { anova, bayes, binomial, chiSquare2x2, describe, mannWhitney, normalTail, poisson, proportions, quantile, regression, welch } from "../../../grading/academy2/p1/statistics";
import { display, field, fsSources, integer, isSources, numberList, output, pairList, toNumber, type Bench } from "./workbench";

export const irisCitation = "UCI Iris · DOI: 10.24432/C56C76";
export const irisUrl = "https://archive.ics.uci.edu/dataset/53/iris";
export const iris = records.map(row=>({ lengths:row.slice(0,4) as number[], species:String(row[4]) }));
const names=["花萼长","花萼宽","花瓣长","花瓣宽"];
function frequency(values: number[], bins=10): Pair[] {
  const low=Math.min(...values),high=Math.max(...values),width=(high-low)/bins||1;
  const out=Array.from({length:bins},()=>0);
  for (const value of values) out[Math.min(bins-1,Math.floor((value-low)/width))]!++;
  return out.map((count,i)=>[low+width*i,count]);
}
export const irisFields = [field("横轴变量编号（1 花萼长，2 花萼宽，3 花瓣长，4 花瓣宽）",1),field("纵轴变量编号（1–4）",3),field("物种：all / setosa / versicolor / virginica","all")];
export function irisOutput([x,y,group]: string[]) {
  const a=integer(x,1,4)-1,b=integer(y,1,4)-1;
  if (a===b) throw Error("请选择两个不同变量，避免用同一列与自己相关。");
  const tag=group!.trim().toLowerCase(), rows=iris.filter(row=>tag==="all"||row.species===tag);
  if (!rows.length) throw Error("请输入 all、setosa、versicolor 或 virginica。");
  const pairs: Pair[]=rows.map(row=>[row.lengths[a]!,row.lengths[b]!]);
  const stats=describe(pairs.map(([,v])=>v)), fit=regression(pairs);
  return {...output([
    ["资料来源",irisCitation],["物种",tag],["单位与变量",names[a]+"（cm）与"+names[b]+"（cm）"],
    ["分组样本数",rows.length], ["纵轴均值（cm）",display(stats.mean)],["纵轴中位数（cm）",display(stats.median)],
    ["纵轴样本标准差（cm）",display(stats.sd)],["纵轴 IQR（cm）",display(stats.iqr)],
    ["Pearson r",display(fit?.r ?? null)],["全表物种数",new Set(iris.map(row=>row.species)).size],
  ],{kind:"points",points:pairs}),source:irisUrl};
}
export const abFields=[field("A 组人数",200),field("A 组成功人数",40),field("B 组人数",200),field("B 组成功人数",63)];
export function abOutput([a,xa,b,xb]: string[]) {
  const result=proportions(integer(a,1),integer(xa),integer(b,1),integer(xb));
  if (!result) throw Error("成功人数必须在 0 与本组人数之间。");
  return output([
    ["A 转化率",display(result.a)],["B 转化率",display(result.b)],["B−A（百分点）",display(100*result.difference)],
    ["合并方差 Z",display(result.z)],["双侧 p",display(result.p)],
    ["近似 95% 区间（百分点）",result.ci?.map(val=>display(val*100)).join(" 至 ") ?? "条件不足，不给近似区间"],
    ["近似适用性",result.approx ? "每组观察与零假设期望的成功、失败计数均 ≥10" : "计数稀疏，应考虑 Fisher 精确检验或随机化检验"],
  ],{kind:"bars",points:[[0,result.a],[1,result.b]]});
}
export const abPython=`import numpy as np
from scipy import stats
n = np.array([200,200]); x = np.array([40,63])
p = x/n
d = p[1]-p[0]; joint=x.sum()/n.sum()
z = d/np.sqrt(joint*(1-joint)*(1/n).sum())
se = np.sqrt((p*(1-p)/n).sum())
print(d, z, 2*stats.norm.sf(abs(z)), d+stats.norm.ppf([.025,.975])*se)`;
const quantilePython=`import numpy as np
x=[2,3,4,5,30]
q1,q3=np.quantile(x,[.25,.75],method="linear")
iqr=q3-q1
print(q1,q3,iqr,[v for v in x if not q1-1.5*iqr<=v<=q3+1.5*iqr])
# 3.0 5.0 2.0 [30]`;

export const statBenches: Record<string,Bench> = {
 "foundation-statistics/data":{
  title:"样本描述与频数",intro:"输入一列数值，检查这列是否有真实测量单位。改变极端值，比较三种中心指标与样本标准差。",
  fields:[field("数值样本（以逗号或空格分开）","1,3,3,5,9")],
  run:([raw])=>{const values=numberList(raw),s=describe(values); return output([["样本量",s.size],["样本均值",display(s.mean)],["中位数",display(s.median)],["频数最高的数值",s.modes.join(", ")],["样本方差（n−1）",display(s.sd*s.sd)],["样本标准差",display(s.sd)]],{kind:"bars",points:frequency(values)});},
  scratch:`const mean = values.reduce((a,b)=>a+b,0) / values.length;
const sampleVariance = values.reduce((s,x)=>s+(x-mean)**2,0)/(values.length-1);`,
  library:`from statistics import mean, median, multimode, variance, stdev
x=[1,3,3,5,9]
print(mean(x),median(x),multimode(x),variance(x),stdev(x))
# 4.2, 3, [3], 9.2, 3.033...`,sources:fsSources},
 "foundation-statistics/distribution":{
  title:"分位点、IQR 与围栏",intro:"先给出分位水平 p。程序排序并按线性方法插值，同时找出围栏外的观测。",
  fields:[field("数值样本","2,3,4,5,30"),field("分位水平（0–1）",.9)],
  run:([raw,level])=>{const values=numberList(raw),s=describe(values),p=toNumber(level,0,1);
   return output([["指定分位点",display(quantile(values,p))],["Q₁",display(s.q1)],["Q₃",display(s.q3)],["IQR",display(s.iqr)],["围栏",display(s.q1-1.5*s.iqr)+" 至 "+display(s.q3+1.5*s.iqr)],["围栏外观测",s.outliers.join(", ")||"无"]],{kind:"bars",points:frequency(values)});},
  scratch:`const h = (sorted.length-1)*p, k=Math.floor(h);
return sorted[k] + (h-k)*(sorted[Math.ceil(h)]-sorted[k]);`,library:quantilePython,sources:fsSources},
 "foundation-statistics/probability":{
  title:"由计数到条件概率",intro:"比较原有概率、命中率与误报率。罕见事件即使命中率高，阳性后的概率也可能很低。",
  fields:[field("原有概率 p",.02),field("P(阳性 | 事件)",.9),field("P(阳性 | 非事件)",.05),field("可选择对象数 n",8),field("选择个数 k",3)],
  run:([p,sen,fpr,n,k])=>{
    const prior=toNumber(p,0,1), model=bayes(prior,toNumber(sen,0,1),toNumber(fpr,0,1));
    const count=integer(n,0,30),sample=integer(k,0,count);
    return output([["组合数 C(n,k)",choose(count,sample)],["总阳性率",display(model.positive)],["阳性后的事件概率",display(model.posterior)]],{kind:"bars",points:[[0,prior],[1,model.posterior??0]]});
  },
  scratch:`const both = prevalence*sensitivity;
const evidence = both+(1-prevalence)*falsePositive;
const posterior = evidence ? both/evidence : null;`,
  library:`from math import comb
from scipy.stats import bernoulli
prior=bernoulli(.02).pmf([0,1])
likelihood=[.05,.9]
weighted=prior*likelihood
print(comb(8,3),weighted.sum(),weighted[1]/weighted.sum())
# 56, 0.067, 0.2686567...`,sources:fsSources},
 "foundation-statistics/visualization":{
  title:"真实测量的散点与相关",intro:"用公开 Iris 数据实际绘制散点图，比较某物种与汇总数据。读出图中簇的差异，说明样本来源与关联不能解释因果。",
  fields:irisFields,run:irisOutput,
  scratch:`const r = sum(dx.map((x,i)=>x*dy[i])) /
    Math.sqrt(sum(dx.map(x=>x*x))*sum(dy.map(y=>y*y)));`,
  library:`import numpy as np
from sklearn.datasets import load_iris
x=load_iris().data  # 校正数据及列顺序与本实验相同
print(np.corrcoef(x[:,0],x[:,2])[0,1])
print(np.mean(x[:,2]), np.std(x[:,2],ddof=1))`,sources:[...fsSources,[irisCitation,irisUrl]]},
 "intermediate-statistics/variables":{
  title:"分布模型与抽样参数",intro:"选择真实参数，核对独立二元计数、固定速率事件数和等待时间模型。比较不同模型的值域。",
  fields:[field("二项试验 n（≤50）",10),field("成功概率 p",.2),field("目标计数 k",2),field("速率 λ",3),field("等待时长 t",.5)],
  run:([n,p,k,rate,t])=>{
    const count=integer(n,1,50),prob=toNumber(p,0,1),goal=integer(k,0,60),lambda=toNumber(rate,.01,30),time=toNumber(t,0,20);
    return output([["Bernoulli 期望",prob],["Binomial P(X=k)",display(binomial(count,prob,goal))],
      ["Binomial 均值与方差",display(count*prob)+" / "+display(count*prob*(1-prob))],["Poisson P(X=k)",display(poisson(lambda,goal))],
      ["标准正态 P(Z>t)",display(normalTail(time))],["指数等待 P(T>t)",display(Math.exp(-lambda*time))]],
      {kind:"bars",points:Array.from({length:count+1},(_,i)=>[i,binomial(count,prob,i)])});
  },
  scratch:`const mass = choose(n,k) * p**k * (1-p)**(n-k);
const survival = Math.exp(-lambda*t);`,
  library:`from scipy.stats import bernoulli, binom, poisson, norm, expon
print(bernoulli.mean(.2), binom.pmf(2,10,.2), poisson.pmf(2,3))
print(norm.sf(.5),expon.sf(.5,scale=1/3))`,sources:isSources},
 "intermediate-statistics/sampling":{
  title:"样本比例的抽样分布",intro:"使用固定随机种子重复取样，分开观测一次样本与大量样本的统计量。增加样本量观察标准误变小。每次实验抽样 400 组。",
  fields:[field("每次抽样 n",40),field("总体成功概率",.5),field("非负随机种子",2027)],
  run:([n,p,seed])=>{
    const size=integer(n,1,500),prob=toNumber(p,0,1),data=sampleBernoulliDistribution(prob,size,400,integer(seed,0,1e9));
    return output([["模拟重复次数",400],["模拟均值",display(data.mean)],["理论中心",prob],["理论标准误",display(data.theoreticalSD)],
     ["Chebyshev 的 ε=.1 上界",display(Math.min(1,prob*(1-prob)/(size*.01)))]],{kind:"bars",points:data.bins.map((count,i)=>[i/10,count])});
  },
  scratch:`// 每一组平均值 = Bernoulli 的成功次数 / n
const standardError = Math.sqrt(p*(1-p)/n);`,
  library:`import numpy as np
from scipy.stats import binom
n,p=40,.5
samples=np.random.default_rng(2027).binomial(n,p,400)/n
print(samples.mean(), (binom.var(n,p)/n**2)**.5)
# 随机数生成器不同，样本均值不要求逐次相同；标准误相同。`,sources:isSources},
 "intermediate-statistics/inference":{
  title:"对照 Z、Welch T 和区间",intro:"两组连续值计算均值差、Welch t 和自由度。仅在给出的总体标准差确实已知时，使用正态区间和 Z 检验。SciPy 代码示范 Welch 的尾概率。",
  fields:[field("A 组观测","2,4,6,8,10"),field("B 组观测","6,8,9,10,12"),field("两组已知总体标准差（供 Z 示例）",4)],
  run:([a,b,sigma])=>{
    const A=numberList(a),B=numberList(b),s=toNumber(sigma,.01,10000),test=welch(A,B),dataA=describe(A),dataB=describe(B);
    const difference=dataB.mean-dataA.mean,se=s*Math.sqrt(1/A.length+1/B.length),z=difference/se;
    return output([["B−A 均值差",display(difference)],["Welch t",display(test?.t??null)],["Welch 自由度",display(test?.df??null)],
      ["已知 σ 假设的 Z",display(z)],["Z 双侧 p 值",display(2*normalTail(Math.abs(z)))],["已知 σ 假设的 95% 区间",[difference-1.959964*se,difference+1.959964*se].map(display).join(" 至 ")]]);
  },
  scratch:`const a = sampleVariance(A)/A.length, b = sampleVariance(B)/B.length;
const t = (mean(B)-mean(A))/Math.sqrt(a+b);
const df = (a+b)**2 / (a*a/(A.length-1)+b*b/(B.length-1));`,
  library:`from scipy import stats
a=[2,4,6,8,10]; b=[6,8,9,10,12]
t=stats.ttest_ind(b,a,equal_var=False)
print(t.statistic,t.df,t.pvalue,t.confidence_interval())`,sources:isSources},
 "intermediate-statistics/models":{
  title:"分类、组间差异、回归和秩统计",intro:"同页对比四类问题，观察足量和不足数据时的统计量。选择检验前核对变量类型、独立性、分布与方差假设。",
  fields:[field("2×2 表按行四格计数","30,20,20,30"),field("数值组一","1,2,3"),field("数值组二","2,4,6"),field("数值组三","4,6,8"),field("回归配对（x,y;…）","1,2;2,4;3,3")],
  run:([cells,a,b,c,raw])=>{
    const observed=numberList(cells,4,4);
    if (observed.some(v=>!Number.isInteger(v)||v<0)) throw Error("列联表只能输入非负整数计数。");
    const chi=chiSquare2x2(observed as [number,number,number,number]),A=numberList(a),B=numberList(b),C=numberList(c),groups=anova([A,B,C]),pairs=pairList(raw),line=regression(pairs);
    return output([["Pearson χ²（无连续性修正）",display(chi?.stat??null)],["卡方期望计数",chi?.expected.map(display).join(", ")??"边际为零"],
      ["卡方条件提示",chi?.expected.every(v=>v>=5) ? "四格期望都至少为 5" : "用精确或置换方法比较"],
      ["ANOVA SS_between / SS_within",display(groups.between)+" / "+display(groups.within)],["ANOVA F",display(groups.f)],
      ["回归斜率",display(line?.slope??null)],["回归截距",display(line?.intercept??null)],["Mann–Whitney U（组一）",mannWhitney(A,B)]],{kind:"points",points:pairs});
  },
  scratch:`const expected = rows[i]*cols[j]/total;
const chiContribution = (observed-expected)**2/expected;
const slope = Sxy/Sxx;  // Sxx>0`,
  library:`from scipy import stats
print(stats.chi2_contingency([[30,20],[20,30]],correction=False))
print(stats.f_oneway([1,2,3],[2,4,6],[4,6,8]))
print(stats.linregress([1,2,3],[2,4,3]))
print(stats.mannwhitneyu([1,2,3],[2,4,6],method="asymptotic"))`,sources:isSources},
};
