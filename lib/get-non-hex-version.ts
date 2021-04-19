import { GitOptions, PathOptions, TopLevelDepOptions } from './types';

const PATH_OPTION_PROPS: (keyof PathOptions)[] = ['path', 'in_umbrella'];
const GIT_OPTION_PROPS: (keyof GitOptions)[] = [
  'git',
  'github',
  'ref',
  'branch',
  'tag',
  'submodules',
  'sparse',
];

type HexVersion =
  | undefined
  | {
      title: string;
      labels: Record<string, string>;
    };

export function getNonHexVersion(options?: TopLevelDepOptions): HexVersion {
  if (hasPathOptionProps(options)) return generatePathDepVersion(options);
  else if (hasGitOptionProps(options)) return generateGitDepVersion(options);
}

function hasPathOptionProps(
  options?: TopLevelDepOptions,
): options is PathOptions {
  return PATH_OPTION_PROPS.some((key) => options?.[key]);
}

function generatePathDepVersion(options: PathOptions): HexVersion | undefined {
  if (options.in_umbrella) return { title: 'in_umbrella', labels: {} };
  else if (options.path)
    return { title: 'path', labels: { path: options.path } };
}

function hasGitOptionProps(
  options?: TopLevelDepOptions,
): options is GitOptions {
  return GIT_OPTION_PROPS.some((key) => options?.[key]);
}

function generateGitDepVersion(options: GitOptions): HexVersion {
  const gitAddress = options.github
    ? `https://github.com/${options.github}.git`
    : options.git;
  const ref = options.branch || options.tag || options.ref || 'HEAD';
  const title = `${gitAddress}@${ref}`;
  const labels = {} as any;

  for (const prop of GIT_OPTION_PROPS) {
    if (!options[prop]) continue;
    labels[prop] = options[prop];
  }

  return { title, labels };
}
