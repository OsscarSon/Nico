"""Run the seven project references and emit a reproducible JSON evidence file."""

import argparse
import json
import math
from pathlib import Path
import random
import subprocess
import sys
from tempfile import TemporaryDirectory

from distributed import parallel_squares
from language import execute
from numerical import rk4, simpson, solve
from paper import reproduce
from pipeline import ingest
from service import demonstrate


def require_error(operation):
    try:
        operation()
    except ValueError:
        return
    raise AssertionError("invalid input was accepted")


def verify_numerical(seed):
    rng = random.Random(seed)
    for _ in range(30):
        answer = [rng.randint(-9,9) for _ in range(3)]
        matrix = [[rng.randint(-3,3) for _ in range(3)] for _ in range(3)]
        for i in range(3):
            matrix[i][i] += 15
        rhs = [sum(a*b for a,b in zip(row,answer)) for row in matrix]
        computed = solve(matrix,rhs)
        assert all(math.isclose(a,b,abs_tol=1e-10) for a,b in zip(computed,answer))
    assert solve([[0,1],[2,1]],[4,10]) == [3,4]
    assert abs(simpson(lambda x:x**3,2,0,12)+4)<1e-12
    assert abs(rk4(lambda _,y:y,0,1,1,50)-math.e)<1e-6
    require_error(lambda:solve([[1,2],[2,4]],[1,2]))
    require_error(lambda:simpson(math.sin,0,1,3))
    return {"linearSystems":31,"quadrature":"cubic antiderivative","ode":"exp(1)","invalidCases":2}


def verify_language(seed):
    assert execute("let x=2; repeat 4 { let x=x+3; } if x==14 { print x; } print -2 * (3+4);")["output"] == [14,-14]
    rng = random.Random(seed)
    for _ in range(30):
        a,b,c = (rng.randrange(1,30) for _ in range(3))
        answer = [a-b*c, (a-b)*c, a-b-c, -a//b]
        outputs = execute(f"print {a}-{b}*{c}; print ({a}-{b})*{c}; print {a}-{b}-{c}; print -{a}/{b};")["output"]
        assert outputs==answer
    bad=["print missing;","print 1/0;","repeat 101 {}","let print=2;","repeat 4 { print 1;","print 1@2;"]
    for program in bad:
        require_error(lambda:execute(program))
    return {"programs":31,"rejectedPrograms":len(bad)}


def verify_distributed(seed):
    rows = [random.Random(seed+i).randint(-100,100) for i in range(140)]
    outcome = parallel_squares(rows,4,1)
    assert outcome["total"] == math.fsum(value**2 for value in rows) and outcome["shards"]==4
    assert len(outcome["attempts"])==5 and sum(not a["delivered"] for a in outcome["attempts"])==1
    assert len({a["pid"] for a in outcome["attempts"]})==5
    assert parallel_squares([],2,-1)["total"]==0
    return outcome


def verify_pipeline(_):
    with TemporaryDirectory() as directory:
        path=Path(directory)/"pipeline.sqlite"
        encode=lambda code,when,amount:json.dumps(dict(id=code,time=when,value=amount))
        original=[encode("a",2,7),encode("b",10,8),encode("c",8,3),encode("d",17,4),encode("old",6,200),encode("a",2,9),"broken-json"]
        first=ingest(path,original)
        assert first["counts"]==dict(accepted=4,duplicate=0,late=1,invalid=1,conflict=1)
        assert first["windows"] == [(0,2,10),(10,2,12)]
        replay=ingest(path,original[:-2])
        assert replay["counts"]["duplicate"]==5 and replay["windows"]==first["windows"]
        second=ingest(path,[encode("e",25,9),encode("f",19,1)])
        assert second["windows"]==[(0,2,10),(10,2,12),(20,1,9)] and second["counts"]["late"]==1
        require_error(lambda:ingest(path,[],size=20))
        return {"initial":first,"replayed":replay["counts"],"final":second}


def verify_ai(_):
    script=Path(__file__).resolve().parents[2]/"scripts"/"p4-model-serving.py"
    output=subprocess.check_output([sys.executable,str(script)],text=True,timeout=15)
    evidence=json.loads(output)
    assert evidence["holdout"]==4 and evidence["accuracy"]==1 and evidence["invalidRequestsRejected"]==2
    return evidence


def main():
    projects={"numerical":verify_numerical,"language":verify_language,"distributed":verify_distributed,"pipeline":verify_pipeline,"ai":verify_ai,"service":lambda _:demonstrate(),"paper":reproduce}
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only",choices=projects)
    parser.add_argument("--seed",type=int,default=1959)
    parser.add_argument("--output",type=Path)
    args=parser.parse_args()
    selection=[args.only] if args.only else projects
    evidence={name:projects[name](args.seed) for name in selection}
    report=json.dumps({"seed":args.seed,"projects":evidence},indent=2,ensure_ascii=False)
    if args.output:
        args.output.write_text(report+"\n",encoding="utf-8")
    print(report)


if __name__=="__main__":
    main()
