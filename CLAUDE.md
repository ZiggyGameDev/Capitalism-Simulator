# CLAUDE Development Instructions

## Critical Testing Requirements

**IMPORTANT:** This project MUST be developed with comprehensive automated testing. The user will NEVER be able to help with manual testing. You MUST test everything yourself using automated tests.

## Testing Approach

### 1. Test-Driven Development (TDD) is MANDATORY

You MUST follow this workflow for EVERY feature:

1. **RED** - Write a failing test first
2. **GREEN** - Write minimal code to pass the test
3. **REFACTOR** - Improve code while keeping tests green
4. **VERIFY** - Run all tests to ensure nothing broke

**DO NOT write production code without a test first!**

### 2. Test Everything Automatically

Since the user cannot help with testing, you must:

- Write unit tests for ALL manager classes (100% coverage goal)
- Write integration tests for system interactions
- Write E2E tests for complete user workflows
- Use time manipulation in tests (don't wait for real time)
- Test edge cases, error conditions, and boundary values

### 3. Test Framework Setup

This project uses:
- **Vitest** for unit and integration tests (fast, Vite-native)
- **Playwright** for E2E tests (browser automation)

Run tests frequently during development:
```bash
npm run test:unit         # Fast unit tests
npm run test:integration  # Integration tests
npm run test:e2e          # End-to-end tests
npm test                  # All tests
```

### 4. How to Verify Your Implementation

After implementing each feature:

1. Run the specific test file: `npm run test:unit -- CurrencyManager.test.js`
2. Verify 100% pass rate
3. Run all tests to check for regressions: `npm test`
4. Only move on when ALL tests pass

### 5. Time Manipulation for Testing

DO NOT wait for real time in tests! Use the TestController helper:

```javascript
// WRONG - waiting for real time
await new Promise(resolve => setTimeout(resolve, 2000))

// RIGHT - fast-forward time
testController.fastForward(2) // 2 seconds instantly
testController.completeActivity('chopTree') // Complete immediately
```

### 6. Testing Strategies

#### Unit Tests
Test individual methods in isolation:
- All public methods of manager classes
- Edge cases (empty, null, negative, very large numbers)
- Error conditions
- State changes

#### Integration Tests
Test system interactions:
- Activity completion → Currency changes + XP gains
- Leveling up → New activities unlocked
- Upgrades → Activity stats modified
- Save/Load → State preservation

#### E2E Tests
Test complete user workflows:
- Bootstrap economy (start from nothing)
- Production chains (multiple activities)
- Leveling progression
- Offline progress calculation

### 7. Test Coverage Requirements

MINIMUM coverage for each system:
- **CurrencyManager**: 100% unit tests
- **SkillManager**: 100% unit tests
- **ActivityManager**: 100% unit tests
- **UpgradeManager**: 100% unit tests
- **SaveManager**: 100% unit tests
- **Calculations**: 100% unit tests

If coverage is below 100%, you MUST write more tests!

### 8. Self-Verification Checklist

Before marking any task as complete, verify:

- [ ] All tests pass (`npm test` shows 100% pass rate)
- [ ] No console errors or warnings
- [ ] Edge cases are tested
- [ ] Integration tests confirm system interactions work
- [ ] E2E tests confirm the feature works end-to-end
- [ ] Test coverage is at 100% for the component

### 9. Debugging Failed Tests

When tests fail:
1. Read the error message carefully
2. Check which assertion failed
3. Use console.log in tests to inspect state
4. Fix the implementation, NOT the test (unless test is wrong)
5. Re-run tests until they pass

### 10. Development Workflow

For EVERY feature (example: CurrencyManager.add method):

```bash
# Step 1: Write test first
# Edit: tests/unit/managers/CurrencyManager.test.js
# Add test case for .add() method

# Step 2: Run test (should fail - RED)
npm run test:unit -- CurrencyManager.test.js

# Step 3: Implement minimal code
# Edit: src/managers/CurrencyManager.js
# Write just enough code to pass

# Step 4: Run test again (should pass - GREEN)
npm run test:unit -- CurrencyManager.test.js

# Step 5: Refactor if needed
# Improve code quality, extract methods, etc.

# Step 6: Verify all tests still pass
npm test

# Step 7: Commit when feature is complete and tested
git add .
git commit -m "feat: Add CurrencyManager.add() method with tests"
```

## Documentation References

- See `docs/DESIGN.md` for system architecture and requirements
- See `docs/TESTING.md` for detailed testing strategy and examples
- See `docs/EXAMPLES.md` for skill and activity data

## Git Workflow

Commit frequently after completing milestones:
- After each manager class is fully tested
- After each major feature works end-to-end
- After fixing bugs
- After refactoring

Use conventional commits:
- `feat:` for new features
- `test:` for adding tests
- `fix:` for bug fixes
- `refactor:` for code improvements
- `docs:` for documentation

## Key Principle

**You are working alone and must verify everything yourself through automated tests.**

The user cannot:
- Manually test features
- Click through the UI to verify
- Check if things "look right"
- Debug issues for you

You must:
- Write tests that verify correctness
- Use tests as your verification method
- Trust your tests as the source of truth
- Test edge cases and error conditions

## Success Criteria

A feature is only complete when:
1. All tests pass (100% pass rate)
2. Coverage is at 100% for that component
3. Integration tests confirm it works with other systems
4. E2E tests confirm the user workflow works
5. No console errors or warnings
6. Code is committed to git

**Remember: If you don't test it, it doesn't work!**
