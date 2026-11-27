"""Local parallel workers, explicit transport failure and retry-safe reduce."""

from multiprocessing import get_context


def worker(pipe, shard, rows, fail=False):
    with pipe:
        if not fail:
            pipe.send((shard, sum(value * value for value in rows)))


def launch(context, shard, rows, fail):
    receiver, sender = context.Pipe(duplex=False)
    process = context.Process(target=worker, args=(sender,shard,rows,fail))
    process.start()
    sender.close()
    return process, receiver


def parallel_squares(rows, shards=3, failed_shard=1):
    if not 1 <= shards <= 8 or len(rows) > 10_000:
        raise ValueError("bounded classroom workload")
    context = get_context("spawn")
    active, accepted, attempts = {}, {}, []
    chunks = [rows[i::shards] for i in range(shards)]
    try:
        for shard, chunk in enumerate(chunks):
            active[shard] = launch(context, shard, chunk, shard == failed_shard)
        for shard, chunk in enumerate(chunks):
            process, receiver = active.pop(shard)
            try:
                with receiver:
                    response = receiver.recv() if receiver.poll(5) else None
            except EOFError:
                response = None
            finally:
                process.join(timeout=1)
                if process.is_alive():
                    process.terminate()
                    process.join()
            attempts.append({"shard":shard,"pid":process.pid,"delivered":response is not None})
            if response is None:
                process, receiver = launch(context,shard,chunk,False)
                active[shard] = process, receiver
                if not receiver.poll(5):
                    raise RuntimeError("retry timed out")
                response = receiver.recv()
                attempts.append({"shard":shard,"pid":process.pid,"delivered":True})
            key, value = response
            if key != shard:
                raise RuntimeError("wrong shard received")
            accepted.setdefault(key,value)
        return {"total":sum(accepted.values()),"attempts":attempts,"shards":len(accepted)}
    finally:
        for process, receiver in active.values():
            receiver.close()
            process.join(timeout=1)
            if process.is_alive():
                process.terminate()
                process.join()
