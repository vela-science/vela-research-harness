import { constants } from "node:fs";
import { access, realpath } from "node:fs/promises";
import path from "node:path";

import { isolatedEnvironment, runCommand, type CommandRunner } from "../util/command.js";
import { MAX_EXECUTABLE_BYTES, sha256RegularFile } from "../util/files.js";

export interface RuntimeIdentity {
  binary: string;
  version: string;
  sha256: string;
}

export async function findExecutable(name: string, searchPath = process.env.PATH ?? ""): Promise<string> {
  if (name.includes(path.sep)) {
    const binary = await realpath(path.resolve(name));
    await access(binary, constants.X_OK);
    return binary;
  }
  for (const directory of searchPath.split(path.delimiter)) {
    if (directory === "") continue;
    const candidate = path.join(directory, name);
    try {
      await access(candidate, constants.X_OK);
      return await realpath(candidate);
    } catch {
      // Continue through the explicit PATH only.
    }
  }
  throw new Error(`${name} was not found on PATH`);
}

export async function runtimeIdentity(options: {
  name: string;
  versionArgs?: readonly string[];
  cwd: string;
  home: string;
  runner?: CommandRunner;
}): Promise<RuntimeIdentity> {
  const runner = options.runner ?? runCommand;
  const binary = await findExecutable(options.name);
  const result = await runner({
    argv: [binary, ...(options.versionArgs ?? ["--version"])],
    cwd: options.cwd,
    env: isolatedEnvironment(options.home),
    timeoutMs: 30_000,
    maxOutputBytes: 64 * 1024,
  });
  if (result.exitCode !== 0) throw new Error(`${options.name} version probe failed`);
  const stdout = result.stdout.toString("utf8").trim();
  const version = stdout === "" ? result.stderr.toString("utf8").trim() : stdout;
  if (version === "" || version.length > 4096) {
    throw new Error(`${options.name} returned an invalid version`);
  }
  return {
    binary,
    version,
    sha256: await sha256RegularFile(binary, MAX_EXECUTABLE_BYTES),
  };
}
