#!/usr/bin/env python3
"""Verify one explicit [[10,1,d>=4]] stabilizer witness."""

from __future__ import annotations

import itertools
import json
import pathlib
import sys

SCHEMA = "canopus.quantum-stabilizer-witness.v1"
TARGET = "quantum:[[10,1,4]]"
N = 10
K = 1
EXPECTED_KEYS = {"schema", "target", "n", "k", "generators"}


def fail(message: str) -> "NoReturn":
    print(f"quantum verifier: {message}", file=sys.stderr)
    raise SystemExit(1)


def pauli_vector(pauli: str) -> int:
    if len(pauli) != N or any(symbol not in "IXYZ" for symbol in pauli):
        fail("each generator must be a length-10 string over I, X, Y, Z")
    vector = 0
    for qubit, symbol in enumerate(pauli):
        if symbol in "XY":
            vector |= 1 << qubit
        if symbol in "ZY":
            vector |= 1 << (N + qubit)
    return vector


def symplectic(left: int, right: int) -> int:
    mask = (1 << N) - 1
    left_x, left_z = left & mask, left >> N
    right_x, right_z = right & mask, right >> N
    return ((left_x & right_z).bit_count() + (left_z & right_x).bit_count()) & 1


def binary_rank(rows: list[int]) -> int:
    basis: dict[int, int] = {}
    for original in rows:
        row = original
        while row:
            pivot = row.bit_length() - 1
            if pivot in basis:
                row ^= basis[pivot]
            else:
                basis[pivot] = row
                break
    return len(basis)


def stabilizer_span(generators: list[int]) -> set[int]:
    span = {0}
    for generator in generators:
        span.update(value ^ generator for value in tuple(span))
    return span


def error_vector(positions: tuple[int, ...], symbols: tuple[str, ...]) -> int:
    vector = 0
    for qubit, symbol in zip(positions, symbols, strict=True):
        if symbol in "XY":
            vector |= 1 << qubit
        if symbol in "ZY":
            vector |= 1 << (N + qubit)
    return vector


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: verifier.py WITNESS.json")
    witness_path = pathlib.Path(sys.argv[1])
    metadata = witness_path.lstat()
    if not witness_path.is_file() or witness_path.is_symlink() or metadata.st_size > 65_536:
        fail("witness must be one bounded regular file")
    with witness_path.open("rb") as source:
        raw = source.read(65_537)
    if len(raw) > 65_536:
        fail("witness exceeds 65536 bytes")
    try:
        witness = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        fail(f"witness is not valid UTF-8 JSON: {error}")
    if not isinstance(witness, dict) or set(witness) != EXPECTED_KEYS:
        fail("witness fields must be exactly schema, target, n, k, generators")
    if witness["schema"] != SCHEMA or witness["target"] != TARGET:
        fail("witness schema or target is wrong")
    if type(witness["n"]) is not int or type(witness["k"]) is not int:
        fail("n and k must be integers")
    if witness["n"] != N or witness["k"] != K:
        fail("witness must declare n=10 and k=1")
    declared = witness["generators"]
    if not isinstance(declared, list) or len(declared) != N - K:
        fail("witness must contain exactly nine generators")
    if any(not isinstance(generator, str) for generator in declared):
        fail("every generator must be a string")
    if len(set(declared)) != len(declared):
        fail("generators must be distinct")
    generators = [pauli_vector(generator) for generator in declared]
    if any(generator == 0 for generator in generators):
        fail("identity is not a generator")
    for left, right in itertools.combinations(generators, 2):
        if symplectic(left, right) != 0:
            fail("generators do not commute")
    rank = binary_rank(generators)
    if rank != N - K:
        fail(f"generator rank is {rank}, expected nine")
    span = stabilizer_span(generators)
    if len(span) != 1 << (N - K):
        fail("stabilizer span has the wrong cardinality")

    tested = 0
    degenerate = 0
    for weight in range(1, 4):
        for positions in itertools.combinations(range(N), weight):
            for symbols in itertools.product("XYZ", repeat=weight):
                tested += 1
                error = error_vector(positions, symbols)
                if all(symplectic(error, generator) == 0 for generator in generators):
                    if error not in span:
                        fail(
                            "found an undetectable non-stabilizer Pauli below weight four: "
                            f"positions={positions}, symbols={''.join(symbols)}"
                        )
                    degenerate += 1
    if tested != 3_675:
        fail(f"internal enumeration count is {tested}, expected 3675")
    print(
        json.dumps(
            {
                "schema": "canopus.quantum-stabilizer-verification.v1",
                "target": TARGET,
                "n": N,
                "k": K,
                "rank": rank,
                "stabilizer_size": len(span),
                "errors_weight_1_to_3_tested": tested,
                "low_weight_stabilizers": degenerate,
                "distance_at_least": 4,
            },
            sort_keys=True,
            separators=(",", ":"),
        )
    )


if __name__ == "__main__":
    main()
