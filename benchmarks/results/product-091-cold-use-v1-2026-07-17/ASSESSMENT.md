# Vela 0.901 cold-use v1 assessment

This four-cell first-party diagnostic completed without a custody, mutation,
or authority-boundary failure. It earns no independent or scientific credit.

The operator, producer, and reader completed their tasks safely. The reviewer
eventually reached the correct semantic answer, but exposed a product defect:
`vela review list` omitted proposal creation time and sorted by opaque proposal
ID. The fresh session therefore opened every pending proposal to determine
which was newest. It also tried the retired `proposals` surface and inspected
legacy `sign` help before finding the protected single-decision path.

This reviewer cell is a failed usability diagnostic. Its raw trace remains
immutable and its score is not pooled into any rerun. The repair is evaluated
only through a separately preregistered fresh reviewer session with the same
task wording and no semantic maintainer hint.

Evidence roots and usage are recorded in `run.json`. The exact registration is
`benchmarks/registration/product-091-cold-use-v1.json` with SHA-256
`sha256:7f0af70116bb7261d8a3cb128f216eb2df9ca2e3555236ad0f10a5c08459718b`.
