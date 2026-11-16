# 路线 B 新增课时配图提示词（给 GPT 图像模型）

> 状态：第 1–10 条都已出图并接入。提示词留作存档和重出用。

用法与 `docs/blueprint/06_ART_PROMPTS_FOR_GPT_IMAGE.md` 相同：**先贴那里的「全局风格块」，再贴下面单张提示词**；1600×900（16:9）；图里**不要有任何文字、字母、数字、中文**；同一对话连续出图，并让 GPT「保持与上一张完全一致的线条粗细、配色和风格」。
存到 `public/art/`，然后在对应课时文件里加一行 `art: "文件名"`（现在这 4 课还没有 `art` 字段，页头没图也能正常显示）。

> 注意：避免让图里出现代码、变量名、HTML 标签等"文字"，所以全部用抽象图形表达。

## 1. `lesson-b01-variables.png` — 变量：给数据起名字
```
[全局风格块] Three open-top boxes in a row, drawn as simple flat navy-outlined crates on a faint
graph-paper background. Each crate has a blank rectangular label tag hanging from it (no text on
the tags, just empty rounded rectangles in white). Inside the first crate sits a single amber
#FFB020 round token; the second crate holds a stack of two blue #2457F5 tokens; the third crate is
empty with a dashed outline. A thin circuit trace with 45° bends connects each tag to a small
solder-pad node at the top. Calm, spacious, one clear focal group in the center.
```

## 2. `lesson-b02-conditions.png` — 条件：让程序做选择
```
[全局风格块] A single circuit trace enters from the left and reaches a diamond-shaped decision
junction (a rotated square with navy outline, white fill, small blue dot in the center). From the
junction two traces leave at 45° and 90° angles: the upper one in pass green #12A46B leads to a
small round lightbulb that is lit (amber fill), the lower one in light gray-blue leads to a
lightbulb that is dark (white fill). Solder-pad nodes at every bend. No text, no arrows with
letters. Generous empty space.
```

## 3. `lesson-b03-loops.png` — 循环：让程序重复做事
```
[全局风格块] A rounded rectangular circuit-trace loop (a racetrack of navy lines with 90° corners
and solder-pad nodes at the corners) in the center. Five small amber #FFB020 round tokens sit
along the track, evenly spaced, with a subtle size progression from small to large to suggest
repetition and counting (no numbers). One short entry trace on the left and one exit trace on the
right, in trace blue #2457F5. A small flat gear-less clock-like circle near the loop is NOT
needed. Keep it minimal and symmetrical.
```

## 4. `lesson-b08-html.png` — HTML：网页的骨架
```
[全局风格块] An abstract browser window drawn as a flat rounded rectangle with a navy outline and
three tiny dots in its top-left corner. Inside, the page is shown as a skeleton of stacked blocks:
one wide short bar (heading, trace blue), two medium gray-blue bars (paragraphs), a small group of
three short bars with round bullet dots (list, amber dots), and a small underlined bar (link, in
green). Thin navy trace lines connect the blocks like a tree, with solder-pad nodes at the joints.
All bars are empty shapes: no text, no letters, no code symbols anywhere.
```

## 复用现有图
- `lesson-b10-git-branches.png`（已在 `public/art/`）：蓝图里它对应"Git 分支"。目录里 Git 分支课现在是 `b15-git-branches`，等那一课做出来时在它的 `art` 里直接引用这个文件即可，不需要重画。

## 5. `lesson-b04-functions.png` — 函数：把做法打包
```
[全局风格块] A simple machine drawn as a rounded rectangle with navy outline and a small empty
rounded label plate on top (no text). On the left, an input trace enters through a solder-pad
node carrying a small blue #2457F5 round token; inside the machine two simple flat gears-free
shapes (a small square and a small circle) are connected by a short 45° trace; on the right, an
output trace exits through a solder-pad node carrying a larger amber #FFB020 round token. Below,
two more small blue tokens wait in a queue on the input trace, hinting that the machine can be
used again and again. Calm, spacious, centered.
```

## 6. `lesson-b05-lists.png` — 列表：一排数据
```
[全局风格块] A horizontal row of six equal square cells joined edge to edge, navy outline, white
fill. Five cells each hold a different flat shape (amber circle, blue square, green triangle, amber
circle, blue square); the sixth cell at the right end is empty with a dashed outline, and a thin
trace with a small solder-pad node points to it from above. Under each cell a tiny solder-pad dot
sits on a thin baseline, evenly spaced, suggesting positions. No numbers, no letters.
```

## 7. `lesson-b06-dicts.png` — 字典：用名字找数据
```
[全局风格块] A tall flat cabinet of four stacked drawers, navy outline, white fill. Each drawer
front has a small empty rounded label plate (no text) and a round handle. Two drawers are pulled
open slightly, one shows an amber #FFB020 round token inside, another shows a blue #2457F5 square
token. A thin 45° trace with a solder-pad node links one label plate to its drawer's token, as if
a key finds its value. Generous empty space around the cabinet.
```

## 8. `lesson-b07-debugging.png` — 调试：读懂报错
```
[全局风格块] A long circuit trace running left to right with 90° bends, solder-pad nodes along it.
Near the middle the trace has a clear gap (a break) with two end pads facing each other, the left
side in trace blue #2457F5 and the right side in pale gray-blue. A large round magnifying glass
with a thick navy rim is placed over the gap, its lens showing the break enlarged with a small
amber #FFB020 spark mark. Calm and uncluttered, no text.
```

## 9. `lesson-b09-css.png` — CSS：给网页穿衣服
```
[全局风格块] The same abstract browser-window skeleton idea, but shown twice side by side: on the
left a plain outline-only version (white fill, thin navy lines, gray-blue bars), on the right the
same layout "dressed" with color: the heading bar in trace blue #2457F5, one paragraph bar softly
filled in amber #FFB020, the list dots in pass green #12A46B. A short thin trace with a solder-pad
node and a small round paintbrush-free "swatch" circle (a plain amber circle) connects the two
windows, suggesting the same structure with a new look. All bars empty, no text, no code symbols.
```

## 10. `lesson-b10-css-layout.png` — CSS 布局：盒子与弹性布局
```
[全局风格块] Three equal rounded-square cards in a row inside a thin dashed container outline,
evenly spaced with the outer two touching the container's inner edges. Each card is drawn as
nested rectangles that show layers: a small solid amber #FFB020 core, a pale blue #2457F5 tint
band around it, a navy outline around that, and a faint dotted outer margin line. Two small
double-headed measurement ticks with solder-pad ends sit in the gaps between the cards. No text,
no numbers, no letters.
```

## 11. `lesson-b11-js-dom.png` — JavaScript 与 DOM
```
[全局风格块] The abstract browser-window skeleton from earlier lessons, with a small tree of
rounded nodes (navy outlines, solder-pad dots) hanging below its heading bar, connected by thin
traces. One leaf node is highlighted in amber #FFB020 and a thin trace blue #2457F5 line runs
from a small rounded "code" bracket-free block on the left (just three empty gray-blue bars) to
that amber node, suggesting code reaching in to change one element. No text, no letters, no code
symbols.
```

## 12. `lesson-b12-events.png` — 事件：让网页有反应
```
[全局风格块] A large rounded button shape in the centre, outlined in navy, with a soft amber
#FFB020 ripple of two concentric arcs around its top where a finger-less tap lands (shown only
as a small solid blue #2457F5 dot). From the button a thin trace leads right to a small empty
window outline whose heading bar lights up in pass green #12A46B, suggesting a click causing a
reaction. No hands, no text, no letters, no numbers.
```

## 之后几课的图（先不用画，做课时才需要）
b13 起，到时候补，格式同上。
