# A 路线缺图课时的配图提示词

> 状态：A05、A09、A13 已出图并接入；**只剩 A10（第 3 条）还没有图**。其余提示词留作存档。

用法同 `docs/blueprint/06_ART_PROMPTS_FOR_GPT_IMAGE.md`：**先贴「全局风格块」，再贴下面单张提示词**；1600×900（16:9）；图里**不要有任何文字、字母、数字、中文**；同一对话连续出图，并让 GPT「保持与上一张完全一致的线条粗细、配色和风格」。构图请**居中、占满画面三分之二**（旧图的问题是偏右、太小、留白太多）。
存到 `public/art/`，在课时文件里加 `art: "文件名.png"`。

## 1. `lesson-a05-cpu-cycle.png` — CPU：取指、译码、执行（重出）
```
[全局风格块] A large square microchip seen from above in the center of the frame, light gray-blue
fill with navy outline and short blue pins on every side. Inside it, three amber #FFB020
circular arrows arranged as one loop (fetch, decode, execute) around a small central core. Beside
the loop on the left, three small rounded-square register boxes stacked vertically, the top one
filled trace blue #2457F5, the middle one amber, the bottom one pass green #12A46B. On the right
side, a column of eight small empty memory cells in a row of thin boxes, with one cell highlighted
in amber and a thin circuit trace with a solder-pad node running from the chip to that cell. No
face, no text, no numbers.
```

## 2. `lesson-a09-network-layers.png` — 网络是什么：分层与封装
```
[全局风格块] Four horizontal flat slabs stacked like a layer cake, drawn with navy outlines, in
the center: top slab pale blue, then white, then light gray-blue, then amber at the bottom. Down
the left side, a small square "data" block travels down through the slabs and gets a thin extra
frame wrapped around it at each layer (one, two, three nested frames), shown as three snapshots
of the same block getting larger. On the right side, the same three snapshots appear in reverse
as the frames are peeled off going up. A thin trace with solder-pad nodes joins the bottom slabs
of the two stacks, like a cable between two computers. No text, no numbers, no letters.
```

## 3. `lesson-a10-ip-subnet.png` — IP 地址与子网
```
[全局风格块] Four equal rounded boxes in a row in the center, each divided into eight small
square cells; cells are filled alternately in trace blue #2457F5 and white to suggest bits (no
digits). A thin dividing line cuts through the row after the third box: everything to its left
sits under a pale trace-blue band, the rest under a pale amber #FFB020 band, suggesting network
part versus host part. Below the row, three small house-shaped blocks in a row all under the blue
band's color, linked by a thin circuit trace with solder-pad nodes, and one house in amber off to
the side with no link. No text, no numbers, no dots between boxes.
```

## 4. `lesson-a13-dns.png` — DNS：名字怎么变成地址（重出）
```
[全局风格块] On the left a simple laptop outline, on the right a very large open phone-book shape
(just two tall white pages with a navy spine, many thin gray-blue horizontal lines for entries, no
readable text). A thin trace blue #2457F5 circuit line with 45° bends and solder-pad nodes runs
from the laptop to the book; from the book, one page lifts and a small amber #FFB020
address-tag-shaped label floats back along a second trace toward the laptop. Between them, a
small three-step ladder of rounded boxes (root, middle, last) joined by short traces, hinting at
a lookup chain. Composition centered and large, occupying the middle two thirds of the frame. No
text, no numbers.
```
