#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 SuperPrompt Test Suite');
console.log('========================\n');

// Test categories
const testCategories = [
  { name: 'Authentication', pattern: 'auth.test.js', description: 'User registration, login, validation' },
  { name: 'Prompts', pattern: 'prompts.test.js', description: 'CRUD operations, search, user isolation' },
  { name: 'Enhancement', pattern: 'enhance.test.js', description: 'Text enhancement, AI integration' }
];

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function runTest(category) {
  console.log(`${colors.blue}${colors.bold}Running ${category.name} Tests${colors.reset}`);
  console.log(`${colors.yellow}${category.description}${colors.reset}\n`);
  
  try {
    const result = execSync(`npx jest tests/${category.pattern} --verbose --silent`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log(`${colors.green}✅ ${category.name} tests passed${colors.reset}\n`);
    return { success: true, output: result };
  } catch (error) {
    console.log(`${colors.red}❌ ${category.name} tests failed${colors.reset}\n`);
    return { success: false, output: error.stdout || error.message };
  }
}

function runAllTests() {
  console.log(`${colors.blue}${colors.bold}Running All Tests${colors.reset}\n`);
  
  try {
    const result = execSync('npx jest --verbose --coverage', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log(`${colors.green}✅ All tests passed${colors.reset}\n`);
    return { success: true, output: result };
  } catch (error) {
    console.log(`${colors.red}❌ Some tests failed${colors.reset}\n`);
    return { success: false, output: error.stdout || error.message };
  }
}

function runCoverageReport() {
  console.log(`${colors.blue}${colors.bold}Generating Coverage Report${colors.reset}\n`);
  
  try {
    const result = execSync('npx jest --coverage --coverageReporters=text --coverageReporters=html', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log(`${colors.green}✅ Coverage report generated${colors.reset}\n`);
    console.log(`${colors.yellow}📊 View detailed coverage at: coverage/lcov-report/index.html${colors.reset}\n`);
    return { success: true, output: result };
  } catch (error) {
    console.log(`${colors.red}❌ Coverage report generation failed${colors.reset}\n`);
    return { success: false, output: error.stdout || error.message };
  }
}

function showTestMenu() {
  console.log(`${colors.bold}Test Options:${colors.reset}`);
  console.log('1. Run all tests');
  console.log('2. Run authentication tests only');
  console.log('3. Run prompts tests only');
  console.log('4. Run enhancement tests only');
  console.log('5. Generate coverage report');
  console.log('6. Run tests in watch mode');
  console.log('7. Exit');
  console.log('');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Interactive mode
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    function askQuestion() {
      showTestMenu();
      rl.question('Enter your choice (1-7): ', (answer) => {
        switch (answer.trim()) {
          case '1':
            runAllTests();
            rl.close();
            break;
          case '2':
            runTest(testCategories[0]);
            rl.close();
            break;
          case '3':
            runTest(testCategories[1]);
            rl.close();
            break;
          case '4':
            runTest(testCategories[2]);
            rl.close();
            break;
          case '5':
            runCoverageReport();
            rl.close();
            break;
          case '6':
            console.log(`${colors.blue}Starting tests in watch mode...${colors.reset}`);
            execSync('npx jest --watch', { stdio: 'inherit' });
            rl.close();
            break;
          case '7':
            console.log('Goodbye! 👋');
            rl.close();
            break;
          default:
            console.log(`${colors.red}Invalid choice. Please enter 1-7.${colors.reset}\n`);
            askQuestion();
        }
      });
    }
    
    askQuestion();
  } else {
    // Command line mode
    const command = args[0];
    
    switch (command) {
      case 'all':
        runAllTests();
        break;
      case 'auth':
        runTest(testCategories[0]);
        break;
      case 'prompts':
        runTest(testCategories[1]);
        break;
      case 'enhance':
        runTest(testCategories[2]);
        break;
      case 'coverage':
        runCoverageReport();
        break;
      case 'watch':
        console.log(`${colors.blue}Starting tests in watch mode...${colors.reset}`);
        execSync('npx jest --watch', { stdio: 'inherit' });
        break;
      default:
        console.log(`${colors.red}Unknown command: ${command}${colors.reset}`);
        console.log('Available commands: all, auth, prompts, enhance, coverage, watch');
        process.exit(1);
    }
  }
}

// Check if we're in the right directory
if (!fs.existsSync(path.join(__dirname, 'setup.js'))) {
  console.log(`${colors.red}Error: Tests must be run from the backend directory${colors.reset}`);
  process.exit(1);
}

main(); 