import { findKnowledge } from "../knowledgeRegistry";
import type { LegacyTopicLesson } from "../p1/types";
import type { TopicLesson, TeachingBlock } from "../teaching/schema";
import { labs } from "../../../grading/academy2/advanced/labs";
import { maths } from "./mathematics";
import { statistics } from "./statistics";
import { statisticsExtras } from "./statisticsExtras";
import { advancedProgram } from "./programs";
import { sources } from "./sources";

import { infrastructure } from "./infrastructure";
import { learning } from "./learning";
import { aiExtras } from "./aiExtras";
import { core } from "./core";
import { coreExtras } from "./coreExtras";
import { productionExtras } from "./productionExtras";
import { researchExtras } from "./researchExtras";
import { languages } from "./languages";
import { literacy } from "./literacy";
import { runtimes } from "./runtimes";
import { cryptography } from "./cryptography";
import { dataArchitecture } from "./dataArchitecture";
import { paradigmExtras } from "./paradigmExtras";
import { systemExtras } from "./systemExtras";
import { remainingSystems } from "./remainingSystems";
import { furtherAI } from "./furtherAI";
import { deploymentAI } from "./deploymentAI";
import { softwareDesign } from "./softwareDesign";
import { architecture } from "./architecture";
import { operations } from "./operations";
import { securityCore } from "./securityCore";
import { advancedSecurity } from "./advancedSecurity";
import { distributed } from "./distributed";
import { enrichment } from "./enrichment";
import { appliedDefinitions, appliedSources, appliedTerms } from "../applied";
import { reasoningQuestions } from "../applied/reasoning";
import { appliedEnrichment } from "../applied/enrichment";
import type { Draft } from "./authoring";

import { mathExtras } from "./mathExtras";

export const definitions: Record<string, Draft> = {
  ...maths,
  ...mathExtras,
  ...statistics,
  ...statisticsExtras,
  ...infrastructure,
  ...learning,
  ...aiExtras,
  ...core,
  ...literacy,
  ...runtimes,
  ...cryptography,
  ...dataArchitecture,
  ...paradigmExtras,
  ...systemExtras,
  ...remainingSystems,
  ...furtherAI,
  ...deploymentAI,
  ...softwareDesign,
  ...architecture,
  ...operations,
  ...securityCore,
  ...advancedSecurity,
  ...distributed,
  ...languages,
  ...researchExtras,
  ...productionExtras,
  ...coreExtras,
  ...appliedDefinitions,
};
export function findP4Lesson(id: string) {
  const spec = definitions[id],
    location = findKnowledge(id);
  if (!spec || !location) return undefined;
  const native = spec.lab === "cryptography";
  const lab = native
    ? {
        area: "research" as const,
        title: "密码学完整性实验",
        objective: "使用合成消息验证真实 Web Crypto 操作。",
      }
    : labs[spec.lab];
  if (!lab) throw Error("知识点没有对应实验 " + id);
  const base: LegacyTopicLesson = {
    id,
    concept: spec.definition,
    theory: spec.theory.join("\n"),
    example: spec.example.given,
    mistake: spec.mistake,
    exercises: spec.questions,
  };
  const blocks: TeachingBlock[] = [
    {
      type: "section",
      title: "实际情景与定义",
      blocks: [
        { type: "paragraph", body: spec.hook },
        {
          type: "note",
          tone: "definition",
          title: "定义",
          body: spec.definition,
        },
      ],
    },
    {
      type: "section",
      title: "原理与适用条件",
      blocks: [
        ...spec.theory.map((body) => ({ type: "paragraph" as const, body })),
        ...spec.formulas.map((latex) => ({ type: "math" as const, latex })),
        {
          type: "note",
          tone: "mistake",
          title: "常见误区",
          body: spec.mistake,
        },
      ],
    },
    {
      type: "example",
      level: "standard",
      kind: lab.area === "statistics" ? "statistics" : "math",
      title: "分步案例",
      given: spec.example.given,
      goal: spec.example.goal,
      method: spec.theory[0]!,
      assumptions: spec.theory.at(-1),
      steps: spec.example.steps.map((body, i) => ({
        title: "步骤 " + (i + 1),
        body,
      })),
      answer: spec.example.answer,
      check: spec.example.check,
      reveal: true,
    },
    ...(spec.extra ?? []),
    ...(enrichment[id] ?? []),
    ...(appliedEnrichment[id] ?? []),
    {
      type: "summary",
      points: [spec.definition, spec.example.check, spec.mistake],
    },
    {
      type: "references",
      items: [
        appliedSources[id] ??
          (Object.hasOwn(appliedDefinitions, id)
            ? appliedSources[spec.lab]
            : undefined) ??
          sources[lab.area],
      ],
    },
  ];
  const programming = advancedProgram(spec.lab);
  const lesson: TopicLesson = {
    id,
    blocks,
    questions: [
      ...reasoningQuestions(id),
      ...(programming ? [programming.question] : []),
    ],
  };
  return { ...location, spec, base, lesson, lab, programming };
}

const terms: Record<string, string> = {
  ...appliedTerms,
  "k-d18c520a0205": "Numerical stability",
  "k-f3b8a6450bdc": "Floating-point precision",
  "k-26792901cd39": "LU / QR decomposition",
  "k-ec0de2c9e5b0": "Numerical quadrature",
  "k-597e14981a0f": "Polynomial interpolation",
  "k-946bcb1832cc": "Ordinary differential equation",
  "k-6428532dca21": "Partial differential equation",
  "k-a2a2b7d703b3": "Convex optimization",
  "k-546ec0001b2b": "Fourier transform",
  "k-8188da31f891": "Entropy and Kullback–Leibler divergence",
  "k-6f9d06efbba4": "Maximum likelihood estimation",
  "k-f9cc7290740d": "Survival analysis",
  "k-00d06e86e896": "Bayesian inference",
  "k-4b9462f2e268": "Intermediate representation",
  "k-f85bfced2ed8": "Abstract syntax tree",
  "k-c088c8aa3893": "Garbage collection",
  "k-e0f6db5129ce": "Raft consensus",
  "k-15bea04d0d2f": "Lamport logical clock",
  "k-c2bc39bddbca": "Write-ahead logging",
  "k-c59f6c75c263": "Multiversion concurrency control",
  "k-3224259a7c23": "Stream processing",
  "k-951eea9ae749": "Data lineage",
  "k-bd83fe10c488": "Transformer",
  "k-e618e14a8bed": "Scaled dot-product attention",
  "k-40a5551cd1da": "Service level indicator and objective",
  "k-4f36751cd6f1": "Disaster recovery",
  "k-e922d216e8ea": "Digital signature",
  "k-3cb614ed175b": "Differential privacy",
  "k-8107d88525a2": "Research reproducibility",
  "k-e27f0ba89281": "Ablation study",
};
export const p4Glossary = Object.entries(terms).flatMap(([id, english]) => {
  const topic = findKnowledge(id),
    material = definitions[id];
  return topic && material
    ? [[topic.title, english, material.definition, id] as const]
    : [];
});
