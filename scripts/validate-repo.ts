#!/usr/bin/env node

import { validateRepository } from '../src/lib/repoValidator.js';

async function main() {
    const repoUrl = process.argv[2];
    if (!repoUrl) {
        console.error('Usage: node scripts/validate-repo.js <repo-url>');
        process.exit(1);
    }

    try {
        console.log(`Validating repository: ${repoUrl}`);
        const result = await validateRepository(repoUrl);
        console.log('Validation result:', result);
        if (result.passed) {
            console.log('✅ Repository passed all checks!');
        } else {
            console.log('❌ Repository failed validation:');
            result.errors.forEach(error => console.log(`  - ${error}`));
        }
    } catch (error) {
        console.error('Validation failed with error:', error);
        process.exit(1);
    }
}

main();