"""Independent mathematical references for scripts/final-qa-reference.ts."""

from fractions import Fraction
from itertools import combinations
import json
import sys

import numpy as np
from scipy.stats import binom


def main():
    data = json.load(sys.stdin)
    max_binomial = max_pca = max_fft = 0.0
    for row in data["binomial"]:
        expected = binom.sf(row["k"] - 1, row["n"], row["p"])
        max_binomial = max(max_binomial, abs(expected - row["answer"]))
    for row in data["pca"]:
        values = np.asarray(row["rows"])
        covariance = np.cov(values, rowvar=False)
        expected, _ = np.linalg.eigh(covariance)
        expected = expected[::-1]
        actual = np.asarray(row["variances"])
        basis = np.asarray(row["basis"]).T
        scale = max(np.max(np.abs(covariance)), 1e-24)
        max_pca = max(
            max_pca,
            float(np.max(np.abs(expected - actual)) / scale),
            float(np.max(np.abs(covariance @ basis - basis * actual)) / scale),
        )
        assert np.allclose(basis.T @ basis, np.eye(len(actual)), atol=1e-12, rtol=0)
    for row in data["permutations"]:
        values = [Fraction(x) for x in row["values"]]
        k = row["k"]
        mean_difference = lambda a, b: abs(sum(a)/len(a) - sum(b)/len(b))
        observed = mean_difference(values[:k], values[k:])
        assignments = list(combinations(range(len(values)), k))
        extreme = sum(
            mean_difference([values[i] for i in selected], [x for i,x in enumerate(values) if i not in selected]) >= observed
            for selected in assignments
        )
        assert row["draws"] == len(assignments) and row["extreme"] == extreme
    for row in data["fft"]:
        expected = np.fft.fft(row["values"])
        actual = [complex(x["real"], x["imag"]) for x in row["spectrum"]]
        max_fft = max(max_fft, float(np.max(np.abs(expected - actual))))
    assert max_binomial < 1e-12 and max_pca < 1e-12 and max_fft < 1e-11
    print(json.dumps({"cases": {key:len(values) for key, values in data.items()},
                      "binomialMaxError":max_binomial,"pcaMaxScaledResidual":max_pca,"fftMaxError":max_fft}))


if __name__ == "__main__":
    main()
