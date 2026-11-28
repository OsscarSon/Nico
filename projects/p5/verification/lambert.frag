#version 300 es
precision highp float;
uniform vec3 albedo;
uniform vec3 surfaceNormal;
uniform vec3 lightDirection;
out vec4 pixel;

void main() {
    vec3 n = normalize(surfaceNormal);
    vec3 l = normalize(lightDirection);
    pixel = vec4(albedo * max(0.0, dot(n, l)), 1.0);
}
