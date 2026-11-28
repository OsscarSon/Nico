import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const source = readFileSync(
  new URL("../projects/p5/verification/lambert.frag", import.meta.url),
  "utf8",
);
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage();
  const observed = await page.evaluate((fragment) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const gl = canvas.getContext("webgl2", { antialias: false });
    if (!gl) throw Error("WebGL 2 unavailable");
    const vertex = `#version 300 es
const vec2 vertices[3] = vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));
void main() { gl_Position=vec4(vertices[gl_VertexID],0.,1.); }`;
    const compile = (kind, text) => {
      const shader = gl.createShader(kind);
      gl.shaderSource(shader, text);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    gl.disable(gl.DITHER);
    gl.uniform3f(gl.getUniformLocation(program, "surfaceNormal"), 0, 0, 2);
    gl.uniform3f(gl.getUniformLocation(program, "albedo"), 0.2, 0.4, 0.6);
    return [
      [0, 0, 4],
      [Math.sqrt(3), 0, 1],
      [0, 0, -4],
    ].map((light) => {
      gl.uniform3fv(gl.getUniformLocation(program, "lightDirection"), light);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const rgba = new Uint8Array(4);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
      if (gl.getError() !== gl.NO_ERROR)
        throw Error("WebGL draw or read failed");
      return [...rgba];
    });
  }, source);
  const reference = [
    [51, 102, 153, 255],
    [26, 51, 77, 255],
    [0, 0, 0, 255],
  ];
  observed.forEach((row, i) =>
    row.forEach((channel, j) =>
      assert.ok(Math.abs(channel - reference[i][j]) <= 1),
    ),
  );
  console.log(
    JSON.stringify({
      renderer: "Chromium WebGL2 / SwiftShader",
      observed,
      reference,
    }),
  );
} finally {
  await browser.close();
}
