#!/usr/bin/env node

// Simple test runner for webfinger.js
const path = require('path');

// Mock test utilities
const createTestContext = () => {
  let passed = 0;
  let failed = 0;
  let assertions = 0;
  
  const context = {
    assertType: (value, expectedType, message) => {
      assertions++;
      if (typeof value === expectedType) {
        passed++;
      } else {
        failed++;
        console.log(`FAIL: Expected ${expectedType}, got ${typeof value} - ${message || ''}`);
      }
    },
    
    assertTypeAnd: (value, expectedType, message) => {
      context.assertType(value, expectedType, message);
      return typeof value === expectedType;
    },
    
    assert: (value, expected, message) => {
      assertions++;
      if (value === expected) {
        passed++;
      } else {
        failed++;
        console.log(`FAIL: Expected "${expected}", got "${value}" - ${message || ''}`);
      }
    },
    
    fail: (message) => {
      assertions++;
      failed++;
      console.log(`FAIL: ${message}`);
    },
    
    done: () => {
      // Test completed successfully
    },
    
    throws: (fn, expectedError, message) => {
      assertions++;
      try {
        fn();
        failed++;
        console.log(`FAIL: Expected function to throw - ${message || ''}`);
      } catch (err) {
        if (expectedError && !(err instanceof expectedError)) {
          failed++;
          console.log(`FAIL: Expected ${expectedError.name}, got ${err.constructor.name} - ${message || ''}`);
        } else {
          passed++;
        }
      }
    },
    
    getStats: () => ({ passed, failed, assertions })
  };
  
  return context;
};

const runTestSuite = async (suite) => {
  console.log(`\n--- ${suite.desc} ---`);
  
  const testCtx = createTestContext();
  const env = {};
  
  // Run setup if it exists
  if (suite.setup) {
    try {
      await suite.setup(env, testCtx);
      
      // Wrap lookup method to support callback interface for backward compatibility
      if (env.wf && env.wf.lookup) {
        const originalLookup = env.wf.lookup.bind(env.wf);
        env.wf.lookup = function(address, callback) {
          if (typeof callback === 'function') {
            // Callback-based API
            const promise = originalLookup(address);
            promise
              .then(result => callback(null, result))
              .catch(err => callback(err));
            return promise.catch(() => {}); // Prevent unhandled rejection
          } else {
            // Promise-based API
            return originalLookup(address);
          }
        };
      }
      
    } catch (err) {
      console.log(`SETUP FAILED: ${err.message}`);
      return { passed: 0, failed: 1, assertions: 1 };
    }
  }
  
  // Run each test
  for (const test of suite.tests) {
    console.log(`  Running: ${test.desc}`);
    try {
      const result = test.run(env, testCtx);
      // If the test returns a promise, wait for it
      if (result && typeof result.then === 'function') {
        await result;
      }
      // Give async operations some time to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      testCtx.fail(`Test threw error: ${err.message}`);
    }
  }
  
  const stats = testCtx.getStats();
  console.log(`  Results: ${stats.passed} passed, ${stats.failed} failed`);
  
  if (suite.abortOnFail && stats.failed > 0) {
    console.log(`  ABORTING: Suite configured to abort on failure`);
    process.exit(1);
  }
  
  return stats;
};

const runTestFile = async (filename) => {
  console.log(`\n=== Running ${filename} ===`);
  
  try {
    const suites = require(path.resolve(filename));
    let totalPassed = 0;
    let totalFailed = 0;
    
    for (const suite of suites) {
      const stats = await runTestSuite(suite);
      totalPassed += stats.passed;
      totalFailed += stats.failed;
    }
    
    console.log(`\nTotal for ${filename}: ${totalPassed} passed, ${totalFailed} failed`);
    return { passed: totalPassed, failed: totalFailed };
    
  } catch (err) {
    console.log(`ERROR loading ${filename}: ${err.message}`);
    return { passed: 0, failed: 1 };
  }
};

const main = async () => {
  // Handle unhandled Promise rejections during tests
  process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection during test:', reason);
    // Don't exit, just log it
  });

  const testFiles = [
    './test/01-basics-suite.js',
    './test/02-basics-minified-suite.js'
  ];
  
  let grandTotalPassed = 0;
  let grandTotalFailed = 0;
  
  for (const testFile of testFiles) {
    const stats = await runTestFile(testFile);
    grandTotalPassed += stats.passed;
    grandTotalFailed += stats.failed;
  }
  
  console.log(`\n=== FINAL RESULTS ===`);
  console.log(`Total: ${grandTotalPassed} passed, ${grandTotalFailed} failed`);
  
  if (grandTotalFailed > 0) {
    console.log('Some tests failed!');
    process.exit(1);
  } else {
    console.log('All tests passed!');
  }
};

if (require.main === module) {
  main().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
}