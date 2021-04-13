import { DepGraph, DepGraphBuilder } from '@snyk/dep-graph';
import {
  MixJsonResult,
  LockDepBase,
  LockDepMap,
  Manifest,
  TopLevelDepsArr,
} from './types';
import { OutOfSyncError } from './out-of-sync-error';
import { isDevDependency } from './is-dev-dependency';
import { getNonHexVersion } from './get-non-hex-version';

type NodeId = string;
type ProjectId = 'root' | string;
type Scope = 'dev' | 'prod';
type DepGraphMap = Record<ProjectId, DepGraph>;

export function buildDepGraphs(
  mixJsonResult: MixJsonResult,
  includeDev = false,
  strict = true,
  allProjects = false,
): DepGraphMap {
  const manifest = mixJsonResult?.manifest;
  if (!manifest) throw new Error('No manifest found');

  const lock = mixJsonResult.lock[0];
  if (!lock) throw new Error('No lock file found');

  const lockDepMap: LockDepMap = Object.entries(lock).reduce(
    (acc, [key, dep]) => {
      const [packageManager, name, version, hash, , dependencies] = dep;

      acc[key] = {
        packageManager,
        name,
        version,
        hash,
        dependencies,
      };
      return acc;
    },
    {} as LockDepMap,
  );

  if (mixJsonResult.parent_umbrella_manifest) {
    const umbrella = mixJsonResult.parent_umbrella_manifest;
    const prefix = `${getManifestName(umbrella)}/${umbrella.apps_path}/`;
    const name = `${umbrella.apps_path}/${getManifestName(manifest)}`;

    return {
      [name]: getDepGraph(prefix, manifest, includeDev, lockDepMap, strict),
    };
  }

  const apps =
    allProjects || isEmpty(mixJsonResult.apps) ? {} : mixJsonResult.apps;

  const projects = { root: manifest, ...apps };

  const appsPrefix = `${getManifestName(manifest)}/${manifest.apps_path}/`;

  return Object.entries(projects).reduce((acc, [key, manifest]) => {
    const prefix = key === 'root' ? '' : appsPrefix;
    acc[key] = getDepGraph(prefix, manifest, includeDev, lockDepMap, strict);
    return acc;
  }, {} as DepGraphMap);
}

function isEmpty(obj?: any) {
  return !obj || Object.keys(obj).length === 0;
}

function getDepGraph(
  prefix: string,
  manifest: Manifest,
  includeDev: boolean,
  lockDepMap: LockDepMap,
  strict: boolean,
): DepGraph {
  const builder = new DepGraphBuilder(
    { name: 'hex' },
    getRootPkg(prefix, manifest),
  );

  if (!manifest.deps) return builder.build();

  const transitivesQueue: TransitiveQueueItem[] = [];
  const deps = getTopLevelDeps(manifest);

  for (const topLevelDep of deps) {
    // eslint-disable-next-line prefer-const
    let [depName, depVersionSpec, options] = topLevelDep;
    if (typeof depVersionSpec === 'object') {
      options = depVersionSpec;
      depVersionSpec = undefined;
    }

    const isDev = isDevDependency(options);
    if (!includeDev && isDev) continue;

    const scope = isDev ? 'dev' : 'prod';
    const parentNodeId = builder.rootNodeId;

    let dep: LockDepBase = lockDepMap[depName];
    let labels;
    if (!dep) {
      const nonHexVersion = getNonHexVersion(options);
      if (!nonHexVersion && strict) throw new OutOfSyncError(depName);

      labels = {
        missingLockFileEntry: 'true',
        ...(nonHexVersion?.labels || {}),
      };
      dep = { name: depName, version: nonHexVersion?.title || depVersionSpec! };
    }

    transitivesQueue.push({ dep, parentNodeId, scope, labels });
  }

  while (transitivesQueue.length > 0) {
    const { dep, parentNodeId, scope, labels } = transitivesQueue.shift()!;
    const nodeId = addNode(dep.name, dep.version, scope, labels);
    builder.connectDep(parentNodeId, nodeId);

    if (!dep.dependencies) continue;
    for (const [childName, , childOptions] of dep.dependencies) {
      const lockDep = lockDepMap[childName];
      if (!lockDep && childOptions && !childOptions.optional)
        throw new OutOfSyncError(childName);
      else if (!lockDep) continue;

      transitivesQueue.push({ parentNodeId: nodeId, dep: lockDep, scope });
    }
  }

  return builder.build();

  function addNode(
    name: string,
    version: string | undefined,
    scope: string,
    labels?: any,
  ): NodeId {
    const nodeInfo = {
      labels: {
        scope,
        ...(labels || {}),
      },
    };
    const nodeId = `${name}@${version || ''}`;
    builder.addPkgNode({ name, version }, nodeId, nodeInfo);
    return nodeId;
  }
}

function getRootPkg(prefix: string, manifest: Manifest) {
  const name = getManifestName(manifest);
  return { name: `${prefix}${name}`, version: manifest.version || '0.0.0' };
}

function getManifestName(manifest: Manifest) {
  return (
    manifest.app ||
    manifest.module_name?.replace(/\.Mix\w{4,}$/, '').toLowerCase() ||
    'no_name'
  );
}

function getTopLevelDeps(manifest: Manifest): TopLevelDepsArr {
  return Array.isArray(manifest.deps)
    ? manifest.deps
    : (Object.entries(manifest.deps).map(([key, value]) =>
        Array.isArray(value) ? [key, ...value] : [key, value],
      ) as TopLevelDepsArr);
}

type TransitiveQueueItem = {
  parentNodeId: string;
  dep: LockDepBase;
  scope: Scope;
  labels?: any;
};
