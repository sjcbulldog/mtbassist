# GeomElement Unit Tests

This directory contains comprehensive unit tests for the `GeomElement` and `GeomSegment` classes.

## Test Coverage

The tests cover all public methods and edge cases for:

### GeomElement Class
- **Constructor**: Validates empty initialization
- **addSegment()**: Tests adding segments and copy behavior
- **addSegmentFromPoints()**: Tests point-based segment creation with validation
- **addSegmentFromPointAndLength()**: Tests length-based segment creation with validation
- **segments getter**: Tests segment retrieval
- **clear()**: Tests segment removal
- **length getter**: Tests count tracking
- **merge()**: Tests adjacent segment merging logic

### GeomSegment Class
- **Constructor**: Tests initialization with start and length
- **Property access**: Tests direct property manipulation

## Test Categories

1. **Basic functionality tests**: Core method behavior
2. **Edge case tests**: Zero values, negative values, boundary conditions
3. **Error handling tests**: Invalid input validation
4. **Integration tests**: Complex workflows combining multiple operations

## Running Tests

To run these tests:

```bash
# Compile tests
npm run compile-tests

# Run all tests
npm test
```

Or run individually using VS Code's Test Explorer.

## Test Structure

Tests use Mocha's TDD interface with the following structure:
- `suite()`: Groups related tests
- `test()`: Individual test cases  
- `assert.strictEqual()`: Assertions for exact value matching
- `assert.throws()`: Assertions for error conditions

## Key Test Cases

### Merge Algorithm Tests
The merge functionality is thoroughly tested with scenarios including:
- Adjacent segments that should merge
- Non-adjacent segments that should remain separate
- Multiple consecutive adjacent segments
- Mixed adjacent and non-adjacent segments
- Zero-length segments
- Empty collections

### Error Validation Tests
Input validation is tested for:
- Negative lengths (should throw)
- End points less than start points (should throw)
- Edge cases with zero values (should work)
- Negative coordinates (should work)

### Memory Safety Tests
- Segment copying behavior (modifications to original don't affect stored copy)
- Clear operation effectiveness
- Property immutability where expected