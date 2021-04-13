type AppPath = string;

export type MixJsonResult = {
  manifest: Manifest;
  lock: [Lock];
  apps?: Record<AppPath, Manifest>;
  parent_umbrella_manifest?: Manifest;
};

export type Manifest = {
  app: string;
  version: string;
  elixir: string;
  start_permanent: boolean;
  deps: TopLevelDeps;
  description: string;
  package: any;
  name: string;
  module_name: string;
  apps_path?: string;
};

type Lock = Record<
  DepName,
  [
    PackageManager,
    DepName,
    DepVersion,
    DepHash,
    [BuildTool],
    Dependency[],
    Repo,
    DepHash2,
  ]
>;

export type LockDepMap = Record<DepName, LockDep>;
export type LockDepBase = {
  name: DepName;
  version: DepVersion;
  dependencies?: Dependency[];
};
type LockDep = LockDepBase & {
  packageManager: PackageManager;
  hash: DepHash;
  dependencies: Dependency[];
};

type Dependency = [
  DepName,
  DepVersionSpec,
  {
    hex: DepName;
    repo: Repo;
    optional: boolean;
  },
];

type PackageManager = 'hex';
type Compiler = 'mix' | 'rebar' | 'make';
type Manager = 'mix' | 'rebar' | 'rebar3' | 'make';
type BuildTool = 'mix';
type DepName = string;
type DepVersion = string;
type DepVersionSpec = string;
type DepHash = string;
type DepHash2 = string;
type Repo = 'hexpm';

type Environment = 'dev' | 'test' | 'prod';

type DependencyDefinitionOptions = {
  app?: false | 'read';
  env?: string;
  compile?: Compiler;
  optional?: boolean;
  only?: Environment | Environment[];
  override?: boolean;
  manager?: Manager;
  runtime?: boolean;
  system_env?: boolean;
};

export type GitOptions = {
  git?: string;
  github?: string;
  ref?: string;
  branch?: string;
  tag?: string;
  submodules?: string;
  sparse?: string;
};

export type PathOptions = {
  path?: string;
  in_umbrella?: boolean;
};

export type TopLevelDepOptions = DependencyDefinitionOptions &
  GitOptions &
  PathOptions;

type TopLevelDepsMap = Record<
  DepName,
  DepVersionSpec | TopLevelDepOptions | [DepVersionSpec?, TopLevelDepOptions?]
>;
type TopLevelDep = [DepName, DepVersionSpec?, TopLevelDepOptions?];
export type TopLevelDepsArr = TopLevelDep[];
type TopLevelDeps = TopLevelDepsArr | TopLevelDepsMap;
