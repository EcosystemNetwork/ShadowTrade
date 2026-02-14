import { spawn } from "child_process";
import * as path from "path";

export interface TestResult {
  name: string;
  status: "passed" | "failed";
  duration?: number;
  error?: string;
}

export interface TestFileResult {
  name: string;
  tests: TestResult[];
}

export interface TestRunResult {
  success: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  testResults: TestFileResult[];
  timestamp: string;
}

/**
 * Run the test suite and return structured results.
 */
export async function runTests(): Promise<TestRunResult> {
  return new Promise((resolve) => {
    const projectRoot = path.resolve(__dirname, "..", "..");
    
    // Run vitest directly using npx, excluding admin-panel tests to avoid recursion
    const testProcess = spawn("npx", ["vitest", "run", "--exclude", "tests/admin-panel.test.ts"], {
      cwd: projectRoot,
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    testProcess.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    testProcess.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    testProcess.on("close", (code) => {
      const result = parseTestOutput(stdout, stderr, code === 0);
      resolve(result);
    });

    testProcess.on("error", (err) => {
      console.error("Failed to run tests:", err);
      resolve({
        success: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        duration: 0,
        testResults: [],
        timestamp: new Date().toISOString(),
      });
    });
  });
}

/**
 * Parse test output from vitest and structure it.
 */
function parseTestOutput(
  stdout: string,
  stderr: string,
  success: boolean
): TestRunResult {
  const testResults: TestFileResult[] = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let duration = 0;

  // Strip ANSI codes from stdout
  const cleanStdout = stdout.replace(/\x1b\[[0-9;]*m/g, '');

  try {
    // Try to parse JSON output from vitest
    const lines = cleanStdout.split("\n");
    for (const line of lines) {
      if (line.trim().startsWith("{") && line.includes("testResults")) {
        try {
          const json = JSON.parse(line);
          return parseVitestJsonOutput(json);
        } catch {
          // Continue to fallback parsing
        }
      }
    }

    // Fallback: Parse text output
    const testFileRegex = /✓\s+tests\/([^\s]+\.test\.ts)\s+\((\d+)\s+tests?\)/g;
    const failedFileRegex = /✗\s+tests\/([^\s]+\.test\.ts)\s+\((\d+)\s+tests?\)/g;
    
    let match;
    while ((match = testFileRegex.exec(cleanStdout)) !== null) {
      const fileName = match[1];
      const testCount = parseInt(match[2], 10);
      
      testResults.push({
        name: `tests/${fileName}`,
        tests: Array.from({ length: testCount }, (_, i) => ({
          name: `Test ${i + 1}`,
          status: "passed",
        })),
      });
      
      totalTests += testCount;
      passedTests += testCount;
    }

    while ((match = failedFileRegex.exec(cleanStdout)) !== null) {
      const fileName = match[1];
      const testCount = parseInt(match[2], 10);
      
      testResults.push({
        name: `tests/${fileName}`,
        tests: Array.from({ length: testCount }, (_, i) => ({
          name: `Test ${i + 1}`,
          status: "failed",
        })),
      });
      
      totalTests += testCount;
      failedTests += testCount;
    }

    // Parse summary - looking for pattern like "      Tests  89 passed (89)"
    const summaryMatch = /\s*Tests\s+(\d+)\s+passed\s+\((\d+)\)/i.exec(cleanStdout);
    if (summaryMatch) {
      const passed = parseInt(summaryMatch[1], 10);
      const total = parseInt(summaryMatch[2], 10);
      totalTests = total;
      passedTests = passed;
      failedTests = total - passed;
    }

    // Parse file count - looking for pattern like "Test Files  14 passed (14)"
    const fileMatch = /\s*Test\s+Files\s+(\d+)\s+passed\s+\((\d+)\)/i.exec(cleanStdout);
    
    // Parse duration
    const durationMatch = /\s*Duration\s+([\d.]+)s/i.exec(cleanStdout);
    if (durationMatch) {
      duration = Math.round(parseFloat(durationMatch[1]) * 1000);
    }
  } catch (err) {
    console.error("Error parsing test output:", err);
  }

  return {
    success,
    totalTests,
    passedTests,
    failedTests,
    duration,
    testResults,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Parse JSON output from vitest reporter.
 */
function parseVitestJsonOutput(json: any): TestRunResult {
  const testResults: TestFileResult[] = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let duration = 0;

  if (json.testResults && Array.isArray(json.testResults)) {
    for (const file of json.testResults) {
      const tests: TestResult[] = [];
      
      if (file.assertionResults && Array.isArray(file.assertionResults)) {
        for (const test of file.assertionResults) {
          const status = test.status === "passed" ? "passed" : "failed";
          tests.push({
            name: test.title || test.ancestorTitles?.join(" > ") || "Unknown test",
            status,
            duration: test.duration,
            error: test.failureMessages?.join("\n") || undefined,
          });
          
          totalTests++;
          if (status === "passed") {
            passedTests++;
          } else {
            failedTests++;
          }
        }
      }
      
      testResults.push({
        name: file.name || "Unknown file",
        tests,
      });
      
      if (file.endTime && file.startTime) {
        duration += file.endTime - file.startTime;
      }
    }
  }

  return {
    success: failedTests === 0 && totalTests > 0,
    totalTests,
    passedTests,
    failedTests,
    duration,
    testResults,
    timestamp: new Date().toISOString(),
  };
}
