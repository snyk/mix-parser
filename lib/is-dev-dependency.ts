import { TopLevelDepOptions } from './types';

/*
 * A dependency can be a limited to more than one environment (i.e. :dev and :test)
 * The logic to decide the scope (dev/prod):
 * If the dependency is not whitelisted, or if :prod is in the `only` whitelist, we consider it as a prod dependency
 * Otherwise it's a dev dependency.
 * */
export function isDevDependency(options?: TopLevelDepOptions) {
  if (!options || !options.only) return false;

  const envs = Array.isArray(options.only) ? options.only : [options.only];

  return envs.every((env) => env !== 'prod');
}
