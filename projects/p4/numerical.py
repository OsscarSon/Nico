"""Small numerical library with independent checks in verify.py."""

import math


def solve(matrix, rhs):
    """Solve a square system with scaled partial pivoting."""
    n = len(matrix)
    if n == 0 or len(rhs) != n or any(len(row) != n for row in matrix):
        raise ValueError("incompatible dimensions")
    rows = [[*row, value] for row, value in zip(matrix, rhs)]
    scales = [max(map(abs, row)) for row in matrix]
    if any(not math.isfinite(value) for row in rows for value in row):
        raise ValueError("non-finite values")
    if min(scales) == 0:
        raise ValueError("singular matrix")
    for k in range(n):
        pivot = max(range(k, n), key=lambda i: abs(rows[i][k]) / scales[i])
        if abs(rows[pivot][k]) <= math.ulp(1.0) * n * scales[pivot]:
            raise ValueError("singular or unusable pivot")
        rows[k], rows[pivot] = rows[pivot], rows[k]
        scales[k], scales[pivot] = scales[pivot], scales[k]
        for i in range(k + 1, n):
            factor = rows[i][k] / rows[k][k]
            for j in range(k + 1, n + 1):
                rows[i][j] -= factor * rows[k][j]
            rows[i][k] = 0
    answer = [0] * n
    for i in range(n - 1, -1, -1):
        residual = rows[i][-1] - math.fsum(rows[i][j] * answer[j] for j in range(i + 1, n))
        answer[i] = residual / rows[i][i]
    return answer


def simpson(f, start, stop, pieces):
    if not isinstance(pieces, int) or pieces < 2 or pieces % 2:
        raise ValueError("use an even number of intervals")
    h = (stop - start) / pieces
    middle = math.fsum((4 if i % 2 else 2) * f(start + i*h) for i in range(1, pieces))
    return h * (f(start) + middle + f(stop)) / 3


def rk4(f, start, stop, value, steps):
    if not isinstance(steps, int) or steps < 1:
        raise ValueError("steps must be a positive integer")
    h = (stop - start) / steps
    for i in range(steps):
        x = start + i*h
        a = f(x, value)
        b = f(x + h/2, value + h*a/2)
        c = f(x + h/2, value + h*b/2)
        d = f(x + h, value + h*c)
        value += h * (a + 2*b + 2*c + d) / 6
    return value
