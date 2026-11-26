// Sets the version everywhere it is written down. Used by the release workflows.
// Adapt the list of files at the bottom to the repository (Cargo, pyproject, Tauri config, …).
//
//   node scripts/set-version.mjs 1.2.3
//   node scripts/set-version.mjs 1.2.4-57
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const version = process.argv[2];
// Numeric pre-release suffixes only: Windows MSI installers reject 1.2.4-pre.57.
if (!/^\d+\.\d+\.\d+(-\d+)?$/.test(version ?? "")) {
  console.error(`Not a version this project uses: "${version ?? ""}" (expected 1.2.3 or 1.2.3-45)`);
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const at = (...p) => join(root, ...p);

function json(path, update) {
  const data = JSON.parse(readFileSync(path, "utf8"));
  update(data);
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function replaceOnce(path, pattern, replacement) {
  const before = readFileSync(path, "utf8");
  const after = before.replace(pattern, replacement);
  if (after === before && !before.includes(version)) {
    console.error(`${path}: no version line to update`);
    process.exit(1);
  }
  writeFileSync(path, after);
}

// package.json, and the two root entries npm records in the lockfile
json(at("package.json"), (p) => (p.version = version));
if (existsSync(at("package-lock.json"))) {
  json(at("package-lock.json"), (l) => {
    l.version = version;
    if (l.packages?.[""]) l.packages[""].version = version;
  });
}

// Examples, uncomment what applies:
// replaceOnce(at("Cargo.toml"), /^version = "[^"]*"/m, `version = "${version}"`);
// replaceOnce(at("Cargo.lock"), /(\[\[package\]\]\r?\nname = "<crate>"\r?\nversion = )"[^"]*"/, `$1"${version}"`);
// replaceOnce(at("pyproject.toml"), /^version = "[^"]*"/m, `version = "${version}"`);
void replaceOnce;

console.log(`version ${version}`);
