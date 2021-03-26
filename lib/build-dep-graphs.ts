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

type NodeId = string;
type ProjectId = 'root' | string;
type Scope = 'dev' | 'prod';
type DepGraphMap = Record<ProjectId, DepGraph>;

export function buildDepGraphs(
  mixJsonResult: MixJsonResult,
  includeDev = false,
  strict = true,
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

  const projects = {
    root: manifest,
    ...(mixJsonResult.apps || {}),
  };

  return Object.entries(projects).reduce((acc, [key, manifest]) => {
    acc[key] = getDepGraph(manifest, includeDev, lockDepMap, strict);
    return acc;
  }, {} as DepGraphMap);
}

function getDepGraph(
  manifest: Manifest,
  includeDev: boolean,
  lockDepMap: LockDepMap,
  strict: boolean,
): DepGraph {
  const builder = new DepGraphBuilder({ name: 'hex' }, getRootPkg(manifest));

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
      if (options?.in_umbrella) depVersionSpec = 'in_umbrella';
      else if (strict) throw new OutOfSyncError(depName);

      labels = { missingLockFileEntry: 'true' };
      dep = { name: depName, version: depVersionSpec! };
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

function getRootPkg(manifest: Manifest) {
  const name =
    manifest.app ||
    manifest.module_name?.replace(/\.Mix\w{4,}$/, '').toLowerCase() ||
    'no_name';
  return { name, version: manifest.version || '0.0.0' };
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