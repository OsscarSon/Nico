"""Use with the private, ephemeral Docker network in verify.sh."""

from http.client import HTTPConnection
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import sys
from time import monotonic, sleep


class Worker(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if self.path != "/shard" or not 1 <= size <= 256:
                raise ValueError("invalid request")
            values = json.loads(self.rfile.read(size))
            if not isinstance(values, list) or len(values) > 32 or any(type(x) is not int or abs(x) > 1000 for x in values):
                raise ValueError("invalid fixture values")
        except (ValueError, TypeError):
            self.send_error(400)
            return
        payload = json.dumps({"subTotal": sum(value**2 for value in values)}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def subtotal(alias, values):
    connection = HTTPConnection(f"node-{alias}", 8123, timeout=.5)
    try:
        connection.request("POST", "/shard", json.dumps(values), {"Content-Type": "application/json"})
        response = connection.getresponse()
        if response.status != 200:
            raise RuntimeError(f"worker {alias} returned {response.status}")
        return json.loads(response.read())["subTotal"]
    finally:
        connection.close()


def verify(expect_missing):
    rows = list(range(1, 13))
    pending = set("abc")
    done = {}
    end = monotonic() + 5
    while pending and monotonic() < end:
        for alias in sorted(pending):
            shard = rows["abc".index(alias)::3]
            try:
                result = subtotal(alias, shard)
            except OSError:
                continue
            if result != sum(value * value for value in shard):
                raise AssertionError((alias, result))
            pending.remove(alias)
            done[alias] = result
        if expect_missing and pending == {expect_missing}:
            break
        if pending:
            sleep(.1)
    if pending != ({expect_missing} if expect_missing else set()):
        raise AssertionError(f"unexpected unavailable workers: {pending}")
    total = sum(done.values()) if not pending else None
    if total is not None and total != sum(value * value for value in rows):
        raise AssertionError("mismatched reduction")
    print(json.dumps({"subtotals": done, "unavailable": sorted(pending), "total": total}))


if __name__ == "__main__":
    if sys.argv[1] == "worker":
        with ThreadingHTTPServer(("0.0.0.0", 8123), Worker) as server:
            server.serve_forever()
    else:
        verify(sys.argv[2] if len(sys.argv) > 2 else "")
