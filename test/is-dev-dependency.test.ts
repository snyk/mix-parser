import { isDevDependency } from '../lib/is-dev-dependency';

describe('is-dev-dependency', () => {
  verify(null, false);
  verify({}, false);
  verify({ only: 'dev' }, true);
  verify({ only: 'test' }, true);
  verify({ only: 'prod' }, false);
  verify({ only: [] }, true);
  verify({ only: ['dev'] }, true);
  verify({ only: ['dev', 'test'] }, true);
  verify({ only: ['dev', 'test', 'prod'] }, false);

  function verify(input: any, expected: boolean) {
    it(JSON.stringify(input), () =>
      expect(isDevDependency(input)).toBe(expected),
    );
  }
});
