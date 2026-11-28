"""Loopback-only reliability exercise with durable writes and a restored copy."""

from concurrent.futures import ThreadPoolExecutor
from contextlib import closing, contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
from time import perf_counter
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import json
import math
import sqlite3


def init(path):
    with closing(sqlite3.connect(path)) as db, db:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, value INTEGER NOT NULL)")


def handler(database):
    class Service(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path != "/jobs":
                self.send_error(404)
                return
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 300:
                    raise ValueError("request size")
                data = json.loads(self.rfile.read(size))
                key, value = data["id"], data["value"]
                if not isinstance(key,str) or not key.isascii() or not 1 <= len(key) <= 30 or type(value) is not int or abs(value) > 100_000:
                    raise ValueError("request shape")
            except (ValueError, TypeError, KeyError):
                self.send_error(400)
                return
            with closing(sqlite3.connect(database,timeout=2)) as db, db:
                db.execute("BEGIN IMMEDIATE")
                existing = db.execute("SELECT value FROM jobs WHERE id=?",(key,)).fetchone()
                if existing is None:
                    db.execute("INSERT INTO jobs VALUES (?,?)",(key,value))
                    status = 201
                else:
                    status = 200 if existing[0] == value else 409
            self.send_response(status)
            self.send_header("Content-Length", "0")
            self.end_headers()

        def log_message(self,*_):
            pass

    return Service


@contextmanager
def running(path):
    with ThreadingHTTPServer(("127.0.0.1",0),handler(path)) as server:
        thread = Thread(target=server.serve_forever)
        thread.start()
        try:
            yield f"http://127.0.0.1:{server.server_port}/jobs"
        finally:
            server.shutdown()
            thread.join()


def request(url, key, value):
    payload = json.dumps({"id":key,"value":value}).encode()
    start = perf_counter()
    try:
        with urlopen(Request(url,data=payload,headers={"Content-Type":"application/json"}),timeout=4) as result:
            code = result.status
    except HTTPError as error:
        code = error.code
        error.close()
    return code, (perf_counter()-start)*1000


def demonstrate():
    with TemporaryDirectory() as directory:
        primary, backup = (Path(directory)/name for name in ("jobs.sqlite","copy.sqlite"))
        init(primary)
        with running(primary) as endpoint, ThreadPoolExecutor(6) as pool:
            inputs=[i%24 for i in range(72)]
            outcomes=list(pool.map(lambda i:request(endpoint,f"demo-{i}",i),inputs))
            assert request(endpoint,"demo-2",78)[0] == 409
            assert request(endpoint,"demo-2","not-an-int")[0] == 400
        with closing(sqlite3.connect(primary)) as source, closing(sqlite3.connect(backup)) as destination:
            source.backup(destination)
            rows, total = destination.execute("SELECT COUNT(*), SUM(value) FROM jobs").fetchone()
        with running(backup) as recovered:
            assert request(recovered,"demo-2",2)[0] == 200
        codes, times = zip(*outcomes)
        assert codes.count(201)==24 and codes.count(200)==48 and rows==24 and total==sum(range(24))
        return {"requests":len(outcomes),"new":codes.count(201),"repeated":codes.count(200),"restoredRows":rows,"restoredTotal":total,"p95Milliseconds":round(sorted(times)[math.ceil(.95*len(times))-1],3)}
