export class OutOfSyncError extends Error {
  public name = 'OutOfSyncError';
  public dependencyName: string;

  constructor(dependencyName: string) {
    super(
      `Dependency ${dependencyName} was not found in ` +
        `mix.lock. Your mix.exs and ` +
        `mix.lock are probably out of sync. Please run ` +
        `"mix deps.get" and try again.`,
    );
    this.dependencyName = dependencyName;
    Error.captureStackTrace(this, OutOfSyncError);
  }
}
