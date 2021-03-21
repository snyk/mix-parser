import { DepGraph, DepGraphBuilder } from '@snyk/dep-graph';
import { MixJsonResult, LockDepBase, LockDepMap } from './types';
import { OutOfSyncError } from './out-of-sync-error';
import { isDevDependency } from './is-dev-dependency';

type NodeId = string;
type Scope = 'dev' | 'prod';

export function buildDepGraph(
  mixJsonResult: MixJsonResult,
  includeDev = false,
  strict = true,
): DepGraph {
  const manifest = mixJsonResult?.manifest;
  if (!manifest) throw new Error('No manifest found');

  const builder = new DepGraphBuilder(
    { name: 'hex' },
    { name: manifest.app, version: manifest.version },
  );

  if (!mixJsonResult.lock?.[0] || !manifest.deps) return builder.build();

  const lockDepMap: LockDepMap = Object.entries(mixJsonResult.lock[0]).reduce(
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

  const transitivesQueue: TransitiveQueueItem[] = [];

  for (const topLevelDep of manifest.deps || []) {
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
      if (strict) throw new OutOfSyncError(depName);

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

type TransitiveQueueItem = {
  parentNodeId: string;
  dep: LockDepBase;
  scope: Scope;
  labels?: any;
};
