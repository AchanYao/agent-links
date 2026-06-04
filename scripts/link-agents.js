#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const configPath = path.join(rootDir, 'agent-links.config.json');
const args = new Set(process.argv.slice(2));
const shouldWatch = args.has('--watch') || args.has('-w');
const dryRun = args.has('--dry-run');

function log(message) {
  console.log(`[agent-links] ${message}`);
}

function expandEnv(value) {
  return value.replace(/\$\{([^}]+)\}/g, (_, name) => {
    const envValue = process.env[name] || getEnvFallback(name);
    if (envValue === undefined) {
      throw new Error(`Environment variable ${name} is not set`);
    }
    return envValue;
  });
}

function getEnvFallback(name) {
  if (name === 'HOME') {
    return process.env.USERPROFILE;
  }

  if (name === 'USERPROFILE') {
    return process.env.HOME;
  }

  return undefined;
}

function resolveConfiguredPath(value) {
  const expanded = expandEnv(value);
  return path.isAbsolute(expanded) ? expanded : path.join(rootDir, expanded);
}

function readConfig() {
  const rawConfig = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(rawConfig);

  return {
    source: {
      agentsFile: resolveConfiguredPath(config.source.agentsFile),
      skillsDir: resolveConfiguredPath(config.source.skillsDir),
    },
    targets: config.targets.filter((target) => {
      return target.enabled !== false && isCurrentPlatform(target.platforms);
    }),
  };
}

function isCurrentPlatform(platforms) {
  return !platforms || platforms.includes(process.platform);
}

function assertSourceExists(sourcePath, kind) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`${kind} source does not exist: ${sourcePath}`);
  }
}

function removeLink(targetPath) {
  const stats = fs.lstatSync(targetPath);
  if (!stats.isSymbolicLink()) {
    return false;
  }

  if (dryRun) {
    log(`would remove stale link: ${targetPath}`);
  } else {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
  return true;
}

function ensureSymlink(sourcePath, targetPath, typeLabel) {
  assertSourceExists(sourcePath, typeLabel);

  const parentDir = path.dirname(targetPath);
  if (!dryRun) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  const targetStats = getLinkStats(targetPath);
  if (targetStats) {
    if (!targetStats.isSymbolicLink()) {
      log(`skip ${targetPath}: existing item is not a symlink`);
      return;
    }

    const currentTarget = path.resolve(parentDir, fs.readlinkSync(targetPath));
    const expectedTarget = path.resolve(sourcePath);
    if (currentTarget === expectedTarget) {
      log(`ok ${targetPath} -> ${sourcePath}`);
      return;
    }

    removeLink(targetPath);
  }

  const linkType = typeLabel === 'directory' ? 'dir' : 'file';
  if (dryRun) {
    log(`would link ${targetPath} -> ${sourcePath}`);
    return;
  }

  fs.symlinkSync(sourcePath, targetPath, linkType);
  log(`linked ${targetPath} -> ${sourcePath}`);
}

function getLinkStats(targetPath) {
  try {
    return fs.lstatSync(targetPath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

function syncOnce() {
  const config = readConfig();
  assertSourceExists(config.source.agentsFile, 'file');
  assertSourceExists(config.source.skillsDir, 'directory');
  let failureCount = 0;

  for (const target of config.targets) {
    try {
      if (target.agentsFile) {
        ensureSymlink(
          config.source.agentsFile,
          resolveConfiguredPath(target.agentsFile),
          'file'
        );
      }

      if (target.skillsDir) {
        ensureSymlink(
          config.source.skillsDir,
          resolveConfiguredPath(target.skillsDir),
          'directory'
        );
      }
    } catch (error) {
      failureCount += 1;
      log(`${target.name}: ${formatError(error)}`);
    }
  }

  if (failureCount > 0) {
    process.exitCode = 1;
  }
}

function formatError(error) {
  if (error && error.code === 'EPERM') {
    return `${error.message}. Enable Windows Developer Mode or run the terminal as Administrator to create symlinks.`;
  }

  return error.message;
}

function debounce(fn, delayMs) {
  let timer = undefined;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, delayMs);
  };
}

function watch() {
  const run = debounce(() => {
    try {
      syncOnce();
    } catch (error) {
      log(error.message);
    }
  }, 150);

  const config = readConfig();
  const watchPaths = [configPath, config.source.agentsFile, config.source.skillsDir];
  for (const watchPath of watchPaths) {
    watchPathSafely(watchPath, watchPath === config.source.skillsDir, run);
    log(`watching ${watchPath}`);
  }
}

function watchPathSafely(watchPath, recursive, listener) {
  try {
    fs.watch(watchPath, { recursive }, listener);
  } catch (error) {
    if (!recursive) {
      throw error;
    }

    fs.watch(watchPath, listener);
    log(`recursive watch is unavailable for ${watchPath}; using non-recursive watch`);
  }
}

try {
  syncOnce();
  if (shouldWatch) {
    watch();
  }
} catch (error) {
  console.error(`[agent-links] ${error.message}`);
  process.exitCode = 1;
}
