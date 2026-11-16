# 07 AI 与提示词部分的插图提示词（给 GPT 图像模型）

> 状态：**尚未出图。** 先出第 A 部分的 2 张（界面已经接好，出图后填一个文件名就显示）；第 B 部分是路线 C 其余课时的课头插图，**对应的课还没写**，等课做出来再用。

## 使用方法（和 `06_ART_PROMPTS_FOR_GPT_IMAGE.md` 一样，再加三条经验）
1. 每次先贴 06 里的**「全局风格块」**，再贴下面单张提示词；图里**不要有任何文字、字母、数字、中文**。
2. 同一对话连续出图；第一张满意后，说「保持与上一张完全一致的线条粗细、配色和风格」。
3. 存到 `public/art/`，文件名必须和下面一致。
4. **新增的三条：**
   - 出图前可以把 `docs/art-source/mascot-byte-sheet.png`（吉祥物设定图）和 `public/art/lesson-c05-prompt-structure.png`（或你觉得最好的一张已有课头图）一起上传，说「按这两张的风格和角色来画」，角色会更稳。
   - 现有课头图的常见问题是主体偏小、留白过多。下面的提示词里都写了主体占画面的比例；如果出来的图主体还是小，追加一句「make the main subject larger, filling about 60% of the canvas width」。
   - 压缩：沿用现有做法，缩放到目标尺寸、压成 64–256 色 PNG（课头图 1600×900，约 50–80KB）。

## A. 界面里用到的（先出这两张）
**A1 AI 导师页顶部** `tutor-byte.png`，800×600（4:3）
接入：放进 `public/art/` 后，在 `src/ai/art.ts` 里把 `tutor` 填成 `"tutor-byte.png"`（现在是未设置）。`tests/trackC.test.ts` 会检查文件真的存在。
```
[全局风格块] The Byte mascot (small square microchip body in light gray-blue with navy outline,
two round dot eyes, small curved smile, short pin arms and legs, a small amber dot on one corner)
stands slightly left of center holding one hand up. Above Byte floats a rounded speech bubble drawn
as an empty white rounded rectangle with a small tail pointing to Byte, containing only three small
solid blue dots (a typing indicator). A thin trace with a solder-pad node connects the bubble to a
tiny open book outline on the right. Byte is about 45% of the canvas height. Friendly, calm.
```
**A2 今日额度用完** `quota-sleeping.png`，800×600
接入：同上，`src/ai/art.ts` 里把 `quota` 填成 `"quota-sleeping.png"`。界面已经接好：只有 AI 返回“今日额度用完”时才会显示这张图（`src/features/prompt-lab/AiError.tsx`）。
```
[全局风格块] The Byte mascot lying curled up and sleeping on a small flat pillow-like rounded
rectangle, eyes drawn as two short closed horizontal lines, a small curved smile, a tiny amber
#FFB020 corner dot dimmed to light gray-blue. Three small simple crescent-like "z" shapes are NOT
allowed (they are letters); instead show three small rounded bubbles of increasing size floating
upward from Byte. A faint moon crescent outline in the upper right. Quiet, spacious composition,
Byte about 40% of the canvas width.
```

> **不用出图的：** AI 不可用的状态直接用了仓库里已有的 `error-offline.png`（芯片小人和断开的线）；Prompt 训练场页头直接用已有的 `lesson-c05-prompt-structure.png`。

## B. 路线 C 其余课头插图（1600×900，16:9；对应的课写出来之后再接入）
接入方法：存到 `public/art/`，在对应课时文件里加 `art: "文件名"`。已经有图的 `lesson-c05`、`lesson-c11-rag`、`lesson-c12-agent-loop` 不用再出。

### B1. `lesson-c01-what-is-llm.png` — C01 大模型是什么，不是什么
```
[全局风格块] A long horizontal row of small blank rounded tiles in light gray-blue connected by a thin trace, the last slot in the row is an empty dashed outline. Right after that slot, three candidate tiles stack up in different heights like a simple bar chart: the tallest in amber #FFB020, the middle in trace blue #2457F5, the shortest in light gray-blue. A single trace from the tallest candidate bends toward the empty slot. Calm, spacious, centered group; the row and candidates fill about 60% of the canvas width.
```

### B2. `lesson-c02-tokens-context.png` — C02 token 与上下文窗口
```
[全局风格块] A long horizontal strip of small rounded tiles of different widths (some short, some long) sliding from left to right through a tall rectangular window frame drawn with a thick navy outline in the center. Tiles inside the frame are filled amber #FFB020; tiles outside the frame on both sides are faded light gray-blue. Faint dotted guide lines show the tiles' motion. No text, no numbers.
```

### B3. `lesson-c03-temperature.png` — C03 温度与随机
```
[全局风格块] On the left, a round dial knob with a notch pointing to a low position, on the right a copy of the same dial with the notch pointing high. A single trace leaves each dial: from the low dial a single straight trace ending in one amber pad; from the high dial the trace fans out into five branching traces with 45° bends ending in pads of mixed colors (blue, amber, green, gray). Symmetrical, tidy, lots of empty space.
```

### B4. `lesson-c04-hallucination.png` — C04 幻觉与核查
```
[全局风格块] A horizontal circuit trace made of solid navy segments that crosses a gap: on the left side, three solid solder-pad nodes; in the middle a missing node drawn as a dashed hollow circle with nothing in it; the trace continues over the gap as a confident solid amber #FFB020 line that does not touch anything. Below it a flat magnifying glass in navy outline hovers over the gap, its lens fill white. Calm and clear; the gap is the focal point.
```

### B5. `lesson-c06-few-shot.png` — C06 给例子（Few-shot）
```
[全局风格块] Three horizontal rows, each with a small input shape on the left, a trace arrow in the middle and an output shape on the right. Row 1: a blue square becomes a blue circle. Row 2: an amber square becomes an amber circle. Row 3: a green square on the left, an arrow, and on the right an empty dashed outline circle waiting to be filled. Rows evenly spaced, shapes simple and flat, solder-pad nodes on the arrows.
```

### B6. `lesson-c07-output-format.png` — C07 指定输出格式
```
[全局风格块] On the left, a loose messy cluster of small rounded tiles in different sizes and colors. In the center, a flat rectangular mold frame with a navy outline shaped like a 3 by 3 grid, the cluster's traces entering it from the left. On the right, the same tiles come out sorted neatly into a 3 by 3 grid with even gaps, colors grouped by column. Calm left-to-right flow.
```

### B7. `lesson-c08-task-splitting.png` — C08 拆任务与多步提示
```
[全局风格块] One large rounded block on the left splits through traces with 90° bends into three smaller blocks arranged in a row to the right; the three smaller blocks are connected one after another by short arrows, forming a chain: the first block lit amber, the second blue, the third green. A small flag-shaped goal node at the far right end. No text.
```

### B8. `lesson-c09-self-check.png` — C09 让模型自我检查
```
[全局风格块] A rounded rectangular loop of trace in the center. On the top edge a block labeled by shape only (a document block with three lines) moves right; at the right side a flat magnifying glass inspects it; below, a small panel shows three empty checkbox squares, two with a green #12A46B tick shape and one empty; the trace returns along the bottom edge into a slightly modified copy of the document block on the left. Minimal, symmetrical.
```

### B9. `lesson-c10-prompt-loop.png` — C10 提示词调优循环
```
[全局风格块] A circular loop of four nodes connected by traces with arrowheads, going clockwise. Node icons (shapes only): a pencil at the top, a play triangle on the right, two side-by-side bars of different heights at the bottom (comparison), a small dial knob on the left (adjust). One node is lit amber #FFB020, others navy outline with white fill. In the center, a small simple Byte-like chip face with two dot eyes. No text.
```

### B10. `lesson-c13-evaluation.png` — C13 评估：怎么知道提示词变好了
```
[全局风格块] Two columns of small round indicator lamps in a test-rig panel. The left column (an older version) has 2 green lamps lit and 4 gray lamps; the right column (a newer version) has 5 green lamps lit and 1 gray lamp. A flat balance beam above the two columns tilts slightly toward the right column. Lamps arranged in neat rows with solder-pad nodes between. No numbers, no text.
```

### B11. `lesson-c14-local-models.png` — C14 本地小模型与隐私
```
[全局风格块] A flat navy-outlined laptop in the center with a small chip drawn on its screen. A dashed cloud outline in the upper right is connected to the laptop by a trace that is cut in the middle with a visible gap, to show nothing leaves the device. A flat padlock shape sits on the laptop in amber #FFB020. Spacious composition, laptop fills about 45% of the canvas width.
```

### B12. `lesson-c15-bias-copyright.png` — C15 偏见与版权
```
[全局风格块] A flat balance scale slightly tilted: the heavier left pan holds five tiles of mostly the same blue color, the lighter right pan holds two tiles in different colors. To the right of the scale, a neat stack of three paper pages with a flat padlock on the top page. Clean symmetrical layout, calm, with solder-pad nodes at the scale pivot. No symbols that look like letters or logos.
```

### B13. `lesson-c16-prompt-injection.png` — C16 提示词注入（防御向）
```
[全局风格块] A flat envelope in the center-left carrying a trace that leads into a chip on the right. A small slip of paper sticks out from inside the envelope with a tiny amber trace that tries to bend away toward a wrong dead-end path. Between the envelope and the chip stands a navy-outlined gate shape with a green #12A46B ticked panel, stopping the stray trace while the main trace passes through. Defensive and calm, not alarming.
```

### B14. `lesson-c17-when-not-ai.png` — C17 什么时候不该用 AI
```
[全局风格块] A decision junction (rotated square with navy outline) at the center-left. From it, two traces leave: the upper trace leads to a small chip icon; the lower trace leads to a simple flat human figure (a circle head and a rounded body, no face details) holding a clipboard. The lower path is highlighted with a pass-green #12A46B pad at its end to show it is the right choice here, the upper is neutral gray-blue. No text.
```

### B15. `lesson-c18-assistant-project.png` — C18 综合项目：AI 助手与评估表
```
[全局风格块] A small friendly Byte mascot (square microchip body, two dot eyes, small smile, pin arms) standing at a flat workbench in the center, snapping together three modules connected by traces: a speech bubble block, a stack of documents block, and a checklist panel with green ticks. Everything is on the grid-paper background; Byte is about 30% of the canvas height, modules arranged around it.
```

## 出图后的检查清单
- 图里没有任何文字、字母、数字、汉字（C16 的信封、C09 的勾选框、C13 的指示灯都容易被画上字，发现就重出）。
- 只用风格块里的配色；没有渐变、阴影、3D 感。
- 主体够大，手机宽度（390px）下一眼能看出画的是什么。
- C14、C15、C17 涉及隐私、偏见、人的场景，画面要中性、不带刻板印象，人物只用最简单的符号形状。
