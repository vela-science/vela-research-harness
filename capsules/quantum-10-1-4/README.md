# Quantum `[[10,1,4]]` verifier capsule

This non-authoritative Python capsule checks one explicit ten-qubit stabilizer
witness. It validates nine distinct non-identity Pauli generators, pairwise
commutation, GF(2) rank nine, and all 3,675 Pauli errors of weight one through
three. A commuting low-weight Pauli must lie in the stabilizer span; otherwise
the candidate has an undetectable logical below weight four and fails.

The capsule establishes `k = 1` and distance at least four for the supplied
generator set. It does not establish optimality, classify all ten-qubit codes,
or turn verifier success into scientific acceptance.

Replay one candidate with:

```bash
python3 capsules/quantum-10-1-4/verifier.py witness.json
```
