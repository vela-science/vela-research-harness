#!/usr/bin/env python3
"""Generate Canopus Stage A packets from the released public Vela references."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
FIXTURE = ROOT / "benchmarks" / "fixtures" / "v0" / "composition"
CASE_IDS = ("unchanged", "correction", "fork")


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")


def sha256(raw: bytes) -> str:
    return "sha256:" + hashlib.sha256(raw).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--vela-source",
        required=True,
        type=Path,
        help="exact public Vela checkout containing research/verifiable-composition",
    )
    arguments = parser.parse_args()
    reference = (
        arguments.vela_source.resolve()
        / "research"
        / "verifiable-composition"
        / "reference"
    )
    if not reference.is_dir():
        raise SystemExit(f"missing public Vela reference directory: {reference}")
    sys.path.insert(0, str(reference))

    from fact_manifest import (
        accepted_context_pack_projection,
        correction_ci_projection,
        resolve_envelope,
        validate_envelope,
    )
    from standards_baseline import (
        build_dsse_envelope,
        build_lock,
        build_statement,
        sha256_bytes,
    )

    semantics_root = sha256_bytes((FIXTURE / "semantics.md").read_bytes())
    outputs: list[tuple[Path, str]] = []
    for case_id in CASE_IDS:
        envelope = json.loads(
            (FIXTURE / f"{case_id}.fact-envelope.json").read_text(encoding="utf-8")
        )
        validate_envelope(envelope)
        manifest = envelope["fact_manifest"]
        statement = build_statement(manifest)
        dsse = build_dsse_envelope(statement)
        lock = build_lock(
            manifest,
            statement,
            dsse,
            semantics_root=semantics_root,
        )
        resolution = resolve_envelope(envelope)
        exact_packet = {
            "schema": "canopus.composition-exact-lock-case.v0",
            "case_id": case_id,
            "fact_manifest_root": envelope["fact_manifest_root"],
            "fact_envelope": envelope,
            "in_toto_statement": statement,
            "dsse_envelope": dsse,
            "science_lock": lock,
        }
        vela_packet = {
            "schema": "canopus.composition-vela-case.v0",
            "case_id": case_id,
            "fact_manifest_root": envelope["fact_manifest_root"],
            "fact_envelope": envelope,
            "resolution": resolution,
            "correction_ci": correction_ci_projection(resolution),
            "context_pack": accepted_context_pack_projection(envelope, resolution),
        }
        for suffix, packet in (("exact-lock", exact_packet), ("vela", vela_packet)):
            path = FIXTURE / f"{case_id}.{suffix}-packet.json"
            raw = canonical_bytes(packet) + b"\n"
            path.write_bytes(raw)
            outputs.append((path, sha256(raw)))

    for path, digest in outputs:
        print(f"{path.relative_to(ROOT)} {digest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
