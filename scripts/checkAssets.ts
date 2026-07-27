import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import {
  SPRITE_IDS,
  SPRITE_MANIFEST,
} from "../src/content/assetManifest";
import type { SpriteId } from "../src/content/assetManifest";

const PUBLIC_ASSETS_ROOT = path.resolve(process.cwd(), "public/assets");
const MANIFEST_ASSETS_PREFIX = "/assets/";

type AssetCheck = {
  readonly id: string;
  readonly displayPath: string;
  readonly ready: boolean;
};

function resolveManifestAsset(src: string): string {
  if (!src.startsWith(MANIFEST_ASSETS_PREFIX)) {
    throw new RangeError(
      `Expected manifest src to start with ${MANIFEST_ASSETS_PREFIX}: ${src}`,
    );
  }

  const relativePath = src.slice(MANIFEST_ASSETS_PREFIX.length);
  const resolvedPath = path.resolve(PUBLIC_ASSETS_ROOT, relativePath);
  const relativeFromRoot = path.relative(PUBLIC_ASSETS_ROOT, resolvedPath);
  if (
    relativeFromRoot.startsWith("..") ||
    path.isAbsolute(relativeFromRoot)
  ) {
    throw new RangeError(
      `Manifest src escapes public assets root: ${src}`,
    );
  }

  return resolvedPath;
}

function isMissingAssetError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error.code === "ENOENT" || error.code === "ENOTDIR")
  );
}

async function isReadableAsset(filePath: string): Promise<boolean> {
  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      return false;
    }
    await access(filePath, constants.R_OK);
    return true;
  } catch (error) {
    if (isMissingAssetError(error)) {
      return false;
    }
    throw error;
  }
}

async function checkAsset(id: SpriteId): Promise<AssetCheck> {
  const spec = SPRITE_MANIFEST[id];
  const filePath = resolveManifestAsset(spec.src);
  const displayPath = path.relative(process.cwd(), filePath);
  return {
    id,
    displayPath,
    ready: await isReadableAsset(filePath),
  };
}

const checks = await Promise.all(SPRITE_IDS.map(checkAsset));
const readyCount = checks.filter(({ ready }) => ready).length;

console.log("Asset checklist");
for (const check of checks) {
  const marker = check.ready ? "[x]" : "[ ]";
  console.log(`${marker} ${check.id} - ${check.displayPath}`);
}
console.log(
  `Summary: ${readyCount} ready, ${
    checks.length - readyCount
  } missing, ${checks.length} total.`,
);
