#!/usr/bin/env node

import { validateRepository } from '../src/lib/repoValidator.js';

async function main() {
    const repoUrl = process.argv[2];
    if (!repoUrl) {
        console.error('Usage: npm run validate-repo -- <repo-url>');
        process.exit(1);
    }

    try {
        console.log(`Validating repository: ${repoUrl}`);
        const result = await validateRepository(repoUrl);
        console.log('Validation result:', result);
        if (result.pass) {
            console.log('✅ Repository passed all checks!');
        } else {
            process.exitCode = 1;
            console.log('❌ Repository failed validation:');
            result.errors.forEach(error => console.log(`  - ${error}`));
        }
    } catch (error) {
        console.error('Validation failed with error:', error);
        process.exit(1);
    }
}

main();