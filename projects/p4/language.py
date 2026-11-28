"""Parse and interpret a bounded, integer-only classroom language."""

import re


TOKEN = re.compile(r"\s*(?:(\d+)|([a-z_][a-z_0-9]*)|(==|[-+*/=;(){}]))")
PRECEDENCE = {"==": 1, "+": 2, "-": 2, "*": 3, "/": 3}
KEYWORDS = {"let", "print", "if", "repeat"}


def scan(source):
    if len(source) > 3000:
        raise ValueError("source length limit")
    source = source.strip()
    index = 0
    while index < len(source):
        match = TOKEN.match(source, index)
        if match is None:
            raise ValueError(f"invalid token at {index}")
        literal, name, symbol = match.groups()
        yield int(literal) if literal is not None else name or symbol
        index = match.end()


class Parser:
    def __init__(self, source):
        self.tokens = [*scan(source), None]
        self.index = 0

    def take(self, expected=None):
        token = self.tokens[self.index]
        if token is None or expected is not None and token != expected:
            raise ValueError(f"expected {expected!r} at token {self.index}")
        self.index += 1
        return token

    def expression(self, minimum=1):
        token = self.take()
        if token == "(":
            left = self.expression()
            self.take(")")
        elif token == "-":
            left = ("neg", self.expression(4))
        elif isinstance(token, int):
            left = ("literal", token)
        elif re.fullmatch(r"[a-z_][a-z_0-9]*", token) and token not in KEYWORDS:
            left = ("var", token)
        else:
            raise ValueError(f"expected expression, got {token!r}")
        while PRECEDENCE.get(self.tokens[self.index], 0) >= minimum:
            operator = self.take()
            right = self.expression(PRECEDENCE[operator] + 1)
            left = (operator, left, right)
        return left

    def block(self, end=None):
        statements = []
        while self.tokens[self.index] != end:
            operator = self.take()
            if operator == "let":
                name = self.take()
                if not isinstance(name, str) or not re.fullmatch(r"[a-z_][a-z_0-9]*", name) or name in KEYWORDS:
                    raise ValueError("invalid binding name")
                self.take("=")
                statements.append((operator, name, self.expression()))
                self.take(";")
            elif operator == "print":
                statements.append((operator, self.expression()))
                self.take(";")
            elif operator in {"if", "repeat"}:
                condition = self.expression()
                self.take("{")
                statements.append((operator, condition, self.block("}")))
                self.take("}")
            else:
                raise ValueError(f"unknown statement {operator!r}")
        return statements


def execute(source):
    variables, printed = {}, []
    remaining = 5000

    def value(node):
        operator, left, *right = node
        if operator == "literal":
            result = left
        elif operator == "var":
            if left not in variables:
                raise ValueError(f"unbound variable {left}")
            result = variables[left]
        elif operator == "neg":
            result = -value(left)
        else:
            a, b = value(left), value(right[0])
            if operator == "/" and b == 0:
                raise ValueError("division by zero")
            result = {"+": lambda: a+b, "-": lambda: a-b, "*": lambda: a*b,
                      "/": lambda: a//b, "==": lambda: int(a==b)}[operator]()
        if abs(result) > 10**12:
            raise ValueError("integer bound exceeded")
        return result

    def run(block):
        nonlocal remaining
        for operator, arg, *tail in block:
            remaining -= 1
            if remaining < 0:
                raise ValueError("step limit")
            if operator == "let":
                variables[arg] = value(tail[0])
            elif operator == "print":
                printed.append(value(arg))
            elif operator == "if":
                if value(arg) != 0:
                    run(tail[0])
            else:
                count = value(arg)
                if not 0 <= count <= 100:
                    raise ValueError("repeat limit")
                for _ in range(count):
                    run(tail[0])

    try:
        syntax = Parser(source).block()
        run(syntax)
    except RecursionError as error:
        raise ValueError("nesting limit") from error
    return {"output": printed, "variables": variables, "tree": syntax}
