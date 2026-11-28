"""Train, freeze and serve a tiny logistic model on an ephemeral loopback port."""

import json
import math
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.error import HTTPError
from urllib.request import Request, urlopen


TRAINING = [(-3, -2, 0), (-2, 0, 0), (-1, -2, 0), (1, 2, 1), (2, 0, 1), (3, 2, 1)]
HOLDOUT = [(-2, -1, 0), (0, -3, 0), (0, 3, 1), (2, 1, 1)]


def probability(weights, intercept, features):
    logit = intercept + sum(weight * value for weight, value in zip(weights, features))
    if logit >= 0:
        return 1 / (1 + math.exp(-logit))
    exponential = math.exp(logit)
    return exponential / (1 + exponential)


def train():
    weights, intercept = [0.0, 0.0], 0.0
    for _ in range(150):
        gradient = [0.0, 0.0]
        bias_gradient = 0.0
        for x, y, label in TRAINING:
            residual = probability(weights, intercept, (x, y)) - label
            gradient[0] += residual * x
            gradient[1] += residual * y
            bias_gradient += residual
        step = 0.2 / len(TRAINING)
        weights = [weight - step * change for weight, change in zip(weights, gradient)]
        intercept -= step * bias_gradient
    return {"version": "synthetic-logistic-v1", "weights": weights, "bias": intercept}


def serving_handler(artifact):
    class ModelHandler(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path != "/predict":
                self.send_error(404)
                return
            try:
                count = int(self.headers.get("Content-Length", "0"))
                if not 0 < count <= 512:
                    raise ValueError("request size")
                payload = json.loads(self.rfile.read(count))
                if not isinstance(payload, dict):
                    raise ValueError("request shape")
                features = payload.get("features")
                if (
                    payload.get("version") != artifact["version"]
                    or not isinstance(features, list)
                    or len(features) != 2
                    or any(type(value) not in (int, float) or not -100 <= value <= 100 for value in features)
                ):
                    raise ValueError("model version or features")
            except ValueError:
                self.send_error(400)
                return
            p = probability(artifact["weights"], artifact["bias"], features)
            body = json.dumps({"version": artifact["version"], "probability": p, "prediction": int(p >= 0.5)}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *_):
            pass

    return ModelHandler


def main():
    with tempfile.TemporaryDirectory() as directory:
        artifact_path = Path(directory) / "model.json"
        artifact_path.write_text(json.dumps(train()), encoding="utf-8")
        artifact = json.loads(artifact_path.read_text(encoding="utf-8"))
        with ThreadingHTTPServer(("127.0.0.1", 0), serving_handler(artifact)) as server:
            thread = Thread(target=server.serve_forever)
            thread.start()
            try:
                endpoint = f"http://127.0.0.1:{server.server_port}/predict"

                def request(features, version=artifact["version"]):
                    body = json.dumps({"version": version, "features": features}).encode()
                    with urlopen(Request(endpoint, data=body, headers={"Content-Type": "application/json"}), timeout=2) as response:
                        return json.load(response)

                outputs = [request([x, y]) for x, y, _ in HOLDOUT]
                correct = sum(output["prediction"] == label for output, (_, _, label) in zip(outputs, HOLDOUT))
                assert correct == len(HOLDOUT)
                rejected = 0
                for features, version in [([1], artifact["version"]), ([1, 2], "obsolete")]:
                    try:
                        request(features, version)
                    except HTTPError as error:
                        assert error.code == 400
                        error.close()
                        rejected += 1
                    else:
                        raise AssertionError("invalid request accepted")
                loss = -sum(math.log(output["probability"] if label else 1 - output["probability"]) for output, (_, _, label) in zip(outputs, HOLDOUT)) / len(HOLDOUT)
                print(json.dumps({"version": artifact["version"], "holdout": len(HOLDOUT), "accuracy": correct / len(HOLDOUT), "logLoss": round(loss, 6), "invalidRequestsRejected": rejected}))
            finally:
                server.shutdown()
                thread.join()


if __name__ == "__main__":
    main()
