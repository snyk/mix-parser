import { buildDepGraph } from '../lib';
import { MixJsonResult } from '../lib/types';
import { OutOfSyncError } from '../lib/out-of-sync-error';

describe('buildDepGraph', () => {
  describe('broken mix json result should throw', () => {
    const expectedError = /No manifest found/;
    verifyThrowsError('empty', {}, expectedError);
    verifyThrowsError('empty lock', { lock: {} }, expectedError);
  });

  describe('fixtures', () => {
    verifyFixture('simple');
    verifyFixture('out-of-sync-top-level', 'all', false);

    describe('out-of-sync-top-level should throw', () => {
      const mixJsonResult = require('./fixtures/out-of-sync-top-level/mix-result.json') as MixJsonResult;
      verifyThrowsError(
        'out-of-sync-top-level throws',
        mixJsonResult,
        OutOfSyncError,
        'all',
        true,
      );
    });
    describe('out-of-sync-transitive should throw', () => {
      const mixJsonResult = require('./fixtures/out-of-sync-transitive/mix-result.json') as MixJsonResult;
      verifyThrowsError(
        'out-of-sync-transitive throws',
        mixJsonResult,
        OutOfSyncError,
        'all',
        'all',
      );
    });
  });
});

type BoolOptions = boolean | 'all';
function verifyFixture(
  name: string,
  includeDev: BoolOptions = 'all',
  strict: BoolOptions = 'all',
) {
  const includeDevOptions =
    includeDev === 'all' ? [true, false] : [includeDev as boolean];
  const strictOptions = strict === 'all' ? [true, false] : [strict as boolean];

  describe(name, () => {
    const mixJsonResult = require(`./fixtures/${name}/mix-result.json`) as MixJsonResult;
    for (const includeDev of includeDevOptions) {
      for (const strict of strictOptions) {
        it(`includeDev=${includeDev}, strict=${strict}`, () => {
          const depGraph = buildDepGraph(
            mixJsonResult,
            includeDev,
            strict,
          ).toJSON();
          expect(depGraph).toMatchSnapshot();
        });
      }
    }
  });
}

function verifyThrowsError(
  name: string,
  mixJsonResult: any,
  error: any,
  includeDev: BoolOptions = 'all',
  strict: BoolOptions = 'all',
) {
  const includeDevOptions =
    includeDev === 'all' ? [true, false] : [includeDev as boolean];
  const strictOptions = strict === 'all' ? [true, false] : [strict as boolean];

  for (const includeDev of includeDevOptions) {
    for (const strict of strictOptions) {
      it(`${name}, includeDev=${includeDev}, strict=${strict}`, () => {
        expect(() =>
          buildDepGraph(mixJsonResult, includeDev, strict),
        ).toThrowError(error);
      });
    }
  }
}
