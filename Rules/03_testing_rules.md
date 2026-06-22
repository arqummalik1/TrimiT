# Unit Testing Enforcement Rules

## 1. Always Write Test Cases
Whenever you create or modify a component, screen, function, hook, or service, you MUST check if it is eligible for unit testing. If it can be tested, you MUST write or update its test cases.

## 2. Test Discovery on Modification
After EVERY file change, your FIRST action must be to find the test cases relevant to that particular file.
- Use `grep_search` or `find` to look for existing `*.test.tsx`, `*.spec.tsx`, `*.test.ts`, or `*.spec.ts` files corresponding to the modified file.
- **If the test case is NOT found:** Create one immediately.
- **If the test case IS found:** Modify the existing test cases accordingly so they do not break and properly cover the new behavior.

## 3. Strict Synchronization
Code changes and test changes must happen together. You are not allowed to consider a modification complete until the corresponding test cases are updated and passing.

## 4. Test Verification
Always run the specific test files using the testing framework (e.g., `npm test -- <path_to_test_file>`) to prove that your test cases and the actual code changes are working correctly before presenting the final result to the user.
