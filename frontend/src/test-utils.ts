/**
 * Simple test utilities for API client testing
 */

export type TestCase = {
  name: string;
  fn: () => Promise<void> | void;
};

export type TestSuite = {
  name: string;
  tests: TestCase[];
};

let passCount = 0;
let failCount = 0;

export function describe(name: string, fn: () => void): void {
  const suite: TestSuite = { name, tests: [] };
  const testStack = (global as any).__testStack || [];
  (global as any).__testStack = [...testStack, suite];

  fn();

  (global as any).__testStack = testStack;
}

export function it(name: string, fn: () => Promise<void> | void): void {
  const testStack = (global as any).__testStack || [];
  const suite = testStack[testStack.length - 1];

  if (suite) {
    suite.tests.push({ name, fn });
  }
}

export function expect<T>(value: T) {
  return {
    toBe(expected: T): void {
      if (value !== expected) {
        throw new Error(`Expected ${value} to be ${expected}`);
      }
    },
    toEqual(expected: T): void {
      if (JSON.stringify(value) !== JSON.stringify(expected)) {
        throw new Error(
          `Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`
        );
      }
    },
    toContain(item: unknown): void {
      if (Array.isArray(value) && !value.includes(item)) {
        throw new Error(`Expected array to contain ${item}`);
      }
    },
    toBeTruthy(): void {
      if (!value) {
        throw new Error(`Expected ${value} to be truthy`);
      }
    },
    toBeFalsy(): void {
      if (value) {
        throw new Error(`Expected ${value} to be falsy`);
      }
    },
  };
}

export async function run(): Promise<void> {
  const suites = (global as any).__testStack || [];

  for (const suite of suites) {
    console.log(`\n📋 ${suite.name}`);

    for (const test of suite.tests) {
      try {
        await test.fn();
        console.log(`  ✓ ${test.name}`);
        passCount++;
      } catch (error) {
        console.log(`  ✗ ${test.name}`);
        console.error(`    ${(error as Error).message}`);
        failCount++;
      }
    }
  }

  console.log(
    `\n📊 Results: ${passCount} passed, ${failCount} failed\n`
  );

  if (failCount > 0) {
    process.exit(1);
  }
}
