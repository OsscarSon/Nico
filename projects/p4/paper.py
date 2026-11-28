"""Reproduce both algorithms from Dijkstra, Numerische Mathematik 1 (1959)."""

import itertools
import math
import random

SOURCE = "https://ir.cwi.nl/pub/9256/9256D.pdf"


def paper_tree(n, weight, start):
    chosen = {start}
    frontier = {node: (weight(start, node), start) for node in range(n) if node != start}
    tree = []
    while frontier:
        node = min(frontier, key=lambda item: (frontier[item][0], item))
        length, parent = frontier.pop(node)
        if not math.isfinite(length):
            raise ValueError("graph is disconnected")
        tree.append((parent, node, length))
        chosen.add(node)
        assert len(chosen) + len(frontier) == n
        for candidate, current in frontier.items():
            edge = weight(node, candidate)
            if edge < current[0]:
                frontier[candidate] = edge, node
    return tree


def paper_path(n, weight, start, end):
    known, frontier = {}, {start: (0, None)}
    while frontier:
        node = min(frontier, key=lambda item: (frontier[item][0], item))
        distance, parent = frontier.pop(node)
        known[node] = distance, parent
        if node == end:
            path = []
            while node is not None:
                path.append(node)
                node = known[node][1]
            return distance, path[::-1]
        for candidate in range(n):
            if candidate in known:
                continue
            edge = weight(node, candidate)
            if edge < 0:
                raise ValueError("negative length")
            total = distance + edge
            if total < frontier.get(candidate, (math.inf, None))[0]:
                frontier[candidate] = total, node
    return math.inf, []


def tree_oracle(n, weight):
    answer = math.inf
    edges = list(itertools.combinations(range(n), 2))
    for subset in itertools.combinations(edges, n-1):
        reachable = {0}
        for _ in range(n-1):
            for left, right in subset:
                if left in reachable or right in reachable:
                    reachable.update((left, right))
        if len(reachable) == n:
            answer = min(answer, sum(weight(a, b) for a, b in subset))
    return answer


def path_oracle(n, weight, a, b):
    distance = [[weight(i, j) for j in range(n)] for i in range(n)]
    for k in range(n):
        for i in range(n):
            for j in range(n):
                distance[i][j] = min(distance[i][j], distance[i][k] + distance[k][j])
    return distance[a][b]


def reproduce(seed=1959, graphs=60):
    rng = random.Random(seed)
    trees = paths = 0
    for index in range(graphs):
        n = 4 + index % 2
        edges = [(a,b,rng.randrange(12)) for a,b in itertools.combinations(range(n),2)]
        undirected = {(a,b):cost for a,b,cost in edges}
        directed = {(a,b):rng.randrange(15) for a in range(n) for b in range(n) if a!=b}

        def weight(a,b):
            return 0 if a==b else undirected[min(a,b),max(a,b)]

        def direction(a,b):
            return 0 if a==b else directed[a,b]

        optimum = tree_oracle(n, weight)
        for source in range(n):
            tree = paper_tree(n,weight,source)
            assert len(tree)==n-1 and sum(cost for _,_,cost in tree)==optimum
            trees += 1
            for target in range(n):
                distance, route = paper_path(n,direction,source,target)
                assert distance==path_oracle(n,direction,source,target)
                assert route[0]==source and route[-1]==target and len(set(route))==len(route)
                assert sum(direction(a,b) for a,b in zip(route,route[1:]))==distance
                paths += 1
    return {"seed":seed,"graphs":graphs,"minimumTrees":trees,"routes":paths,"source":SOURCE}
