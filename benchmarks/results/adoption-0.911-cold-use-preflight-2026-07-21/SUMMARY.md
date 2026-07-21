# Stopped adoption preflight

This diagnostic stopped before any model call because the command used the
historical default registration, which requires Vela 0.900.1, while a newer
Vela binary was installed. It receives no external-gate or scientific-result
credit.

The command also exposed an output-custody defect: the runner reused and
cleared the historical July 17 result directory before preflight. The tracked
historical evidence was restored byte-for-byte from Git. The runner now
requires an explicit fresh `--output` directory and refuses an existing path.
