/**
 * Test cases for email validation
 * This file demonstrates valid and invalid email formats
 */

import { validateEmail, isValidEmail } from './emailValidator';

// Test cases
const testCases = [
  // Valid emails
  { email: 'user@domain.com', expected: true, description: 'Basic email' },
  { email: 'a.b+tag@sub.school.edu.vn', expected: true, description: 'Multi-level domain with plus' },
  { email: 'name@kdbs.co.kr', expected: true, description: 'Korean domain' },
  { email: 'ten123@gmail.com', expected: true, description: 'Gmail with numbers' },
  { email: 'test+label@example.org', expected: true, description: 'Plus alias' },
  { email: 'user.name@university.edu.uk', expected: true, description: 'UK educational domain' },
  { email: 'admin@company.co.jp', expected: true, description: 'Japanese domain' },
  { email: 'support@service.gov.vn', expected: true, description: 'Vietnamese government domain' },
  
  // Invalid emails
  { email: 'user..dot@gmail.com', expected: false, description: 'Consecutive dots in local part' },
  { email: '.start@gmail.com', expected: false, description: 'Starts with dot' },
  { email: 'end.@gmail.com', expected: false, description: 'Ends with dot' },
  { email: 'name@-domain.com', expected: false, description: 'Domain label starts with hyphen' },
  { email: 'name@domain-', expected: false, description: 'Domain label ends with hyphen' },
  { email: 'name@domain', expected: false, description: 'No TLD' },
  { email: 'name@domain.c', expected: false, description: 'TLD too short' },
  { email: 'name@domain..com', expected: false, description: 'Consecutive dots in domain' },
  { email: 'name @gmail.com', expected: false, description: 'Space in email' },
  { email: 'name@domain.123', expected: false, description: 'Numeric TLD' },
  { email: '', expected: false, description: 'Empty email' },
  { email: 'user@', expected: false, description: 'No domain' },
  { email: '@domain.com', expected: false, description: 'No local part' },
  { email: 'user@domain..com', expected: false, description: 'Double dots in domain' },
  { email: 'user@.domain.com', expected: false, description: 'Domain starts with dot' },
  { email: 'user@domain.com.', expected: false, description: 'Domain ends with dot' },
];

// Run tests
console.log('🧪 Email Validation Tests\n');

testCases.forEach((testCase, index) => {
  const result = validateEmail(testCase.email);
  const passed = result.isValid === testCase.expected;
  
  console.log(`Test ${index + 1}: ${passed ? '✅' : '❌'} ${testCase.description}`);
  console.log(`  Email: "${testCase.email}"`);
  console.log(`  Expected: ${testCase.expected ? 'Valid' : 'Invalid'}`);
  console.log(`  Got: ${result.isValid ? 'Valid' : 'Invalid'}`);
  if (!result.isValid && result.error) {
    console.log(`  Error: ${result.error}`);
  }
  console.log('');
});

// Summary
const passedTests = testCases.filter(testCase => {
  const result = validateEmail(testCase.email);
  return result.isValid === testCase.expected;
}).length;

console.log(`📊 Test Results: ${passedTests}/${testCases.length} tests passed`);

export { testCases };
