import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export class TagStore {
  private readonly filePath: string;
  private tags = new Map<string, string>();

  constructor(dataDir: string) {
    this.filePath = join(dataDir, "tags.json");
  }

  async load(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    try {
      const contents = await readFile(this.filePath, "utf8");
      const parsed: unknown = JSON.parse(contents);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid tag store format");
      }
      const tags = new Map<string, string>();
      for (const [tag, address] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof address !== "string") {
          throw new Error(`Invalid tag record for ${tag}`);
        }
        tags.set(tag, address);
      }
      this.tags = tags;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  get(tag: string): string | undefined {
    return this.tags.get(tag);
  }

  isAvailable(tag: string): boolean {
    return !this.tags.has(tag);
  }

  async add(tag: string, address: string): Promise<void> {
    const previous = this.tags.get(tag);
    if (previous !== undefined && previous !== address) {
      throw new Error("tag already exists");
    }

    this.tags.set(tag, address);
    const tempPath = `${this.filePath}.tmp`;
    try {
      await writeFile(tempPath, `${JSON.stringify(Object.fromEntries(this.tags), null, 2)}\n`);
      await rename(tempPath, this.filePath);
    } catch (error) {
      if (previous === undefined) {
        this.tags.delete(tag);
      }
      throw error;
    }
  }
}
