import { constants } from "node:fs";
import { open } from "node:fs/promises";

export async function readBoundedRegularFile(file: string, maxBytes: number): Promise<Buffer> {
  const noFollow = "O_NOFOLLOW" in constants ? constants.O_NOFOLLOW : 0;
  const handle = await open(file, constants.O_RDONLY | noFollow);
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.nlink !== 1) {
      throw new Error(`${file} is not one singly linked regular file`);
    }
    if (before.size > maxBytes) throw new Error(`${file} exceeds ${maxBytes} bytes`);
    const value = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < value.length) {
      const { bytesRead } = await handle.read(value, offset, value.length - offset, offset);
      if (bytesRead === 0) throw new Error(`${file} ended before its declared size`);
      offset += bytesRead;
    }
    const after = await handle.stat();
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs
    ) {
      throw new Error(`${file} changed while it was being read`);
    }
    return value;
  } finally {
    await handle.close();
  }
}

