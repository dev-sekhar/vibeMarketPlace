import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';

export interface ValidationResult {
    pass: boolean;
    errors: string[];
    warnings: string[];
}

export async function validateRepository(repoUrl: string): Promise<ValidationResult> {
    const result: ValidationResult = {
        pass: true,
        errors: [],
        warnings: []
    };

    // Create temp dir
    const tempDir = path.join(process.cwd(), 'temp-repo-' + Date.now());
    try {
        // Clone repo
        const git = simpleGit();
        await git.clone(repoUrl, tempDir, ['--depth', '1']);

        // 1. Documentation Checks
        if (!fs.existsSync(path.join(tempDir, 'README.md'))) {
            result.errors.push('README.md is missing');
            result.pass = false;
        } else {
            const readme = fs.readFileSync(path.join(tempDir, 'README.md'), 'utf8');
            if (readme.trim().length === 0) {
                result.errors.push('README.md is empty');
                result.pass = false;
            }
        }

        const licenseFiles = ['LICENSE', 'LICENSE.md', 'LICENSE.txt'];
        const hasLicense = licenseFiles.some(file => fs.existsSync(path.join(tempDir, file)));
        if (!hasLicense) {
            result.errors.push('LICENSE file is missing');
            result.pass = false;
        }

        if (fs.existsSync(path.join(tempDir, 'CONTRIBUTING.md'))) {
            result.warnings.push('CONTRIBUTING.md found - community contributions expected');
        }

        // 2. Project Hygiene Checks
        if (!fs.existsSync(path.join(tempDir, '.gitignore'))) {
            result.errors.push('.gitignore is missing');
            result.pass = false;
        } else {
            const gitignore = fs.readFileSync(path.join(tempDir, '.gitignore'), 'utf8');
            const requiredPatterns = ['node_modules/', '.env'];
            for (const pattern of requiredPatterns) {
                if (!gitignore.includes(pattern)) {
                    result.warnings.push(`.gitignore missing common pattern: ${pattern}`);
                }
            }
        }

        // Check for sensitive files
        const sensitiveFiles = ['.env', '.env.local', '.env.production', 'private.key', 'credentials.json'];
        for (const file of sensitiveFiles) {
            if (fs.existsSync(path.join(tempDir, file))) {
                result.errors.push(`Sensitive file committed: ${file}`);
                result.pass = false;
            }
        }

        // Check repo size (simple check: count files, warn if many large files)
        const getDirSize = (dir: string): number => {
            let size = 0;
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    size += getDirSize(filePath);
                } else {
                    size += stat.size;
                }
            }
            return size;
        };
        const sizeMB = getDirSize(tempDir) / (1024 * 1024);
        if (sizeMB > 100) {
            result.warnings.push(`Repository size is large: ${sizeMB.toFixed(2)} MB`);
        }

        // 3. Code Structure Checks
        const srcDirs = ['src', 'app', 'lib', 'source'];
        const hasSrc = srcDirs.some(dir => fs.existsSync(path.join(tempDir, dir)));
        if (!hasSrc) {
            result.errors.push('No source directory found (src/, app/, etc.)');
            result.pass = false;
        }

        const entryPoints = ['index.js', 'main.js', 'index.ts', 'main.ts', 'app.js', 'server.js'];
        const hasEntry = entryPoints.some(file => fs.existsSync(path.join(tempDir, file)));
        if (!hasEntry) {
            result.warnings.push('No clear entry point file found');
        }

        const manifests = ['package.json', 'requirements.txt', 'pyproject.toml', 'Cargo.toml', 'go.mod'];
        const hasManifest = manifests.some(file => fs.existsSync(path.join(tempDir, file)));
        if (!hasManifest) {
            result.errors.push('No package manifest found');
            result.pass = false;
        }

        // 4. Testing & Quality Checks
        const testDirs = ['tests', '__tests__', 'test', 'spec'];
        const hasTestDir = testDirs.some(dir => fs.existsSync(path.join(tempDir, dir)));
        if (!hasTestDir) {
            result.warnings.push('No test directory found');
        } else {
            // Check for at least one test file
            let hasTestFile = false;
            for (const dir of testDirs) {
                if (fs.existsSync(path.join(tempDir, dir))) {
                    const files = fs.readdirSync(path.join(tempDir, dir));
                    if (files.some(file => file.endsWith('.test.js') || file.endsWith('.test.ts') || file.endsWith('.spec.js'))) {
                        hasTestFile = true;
                        break;
                    }
                }
            }
            if (!hasTestFile) {
                result.warnings.push('No test files found in test directory');
            }
        }

        const ciFiles = ['.github/workflows', '.gitlab-ci.yml', '.travis.yml', 'azure-pipelines.yml'];
        const hasCI = ciFiles.some(file => fs.existsSync(path.join(tempDir, file)));
        if (!hasCI) {
            result.warnings.push('No CI/CD configuration found');
        }

        const lintFiles = ['.eslintrc', '.eslintrc.js', '.prettierrc', 'flake8', '.flake8', 'tsconfig.json'];
        const hasLint = lintFiles.some(file => fs.existsSync(path.join(tempDir, file)));
        if (!hasLint) {
            result.warnings.push('No linting/formatting configuration found');
        }

        // 5. Security Checks
        // Simple secret scan
        const scanForSecrets = (dir: string) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                if (fs.statSync(filePath).isDirectory()) {
                    if (file !== 'node_modules' && file !== '.git') {
                        scanForSecrets(filePath);
                    }
                } else {
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        // Simple regex for common secrets
                        const secretPatterns = [
                            /api[_-]?key\s*[:=]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/i,
                            /password\s*[:=]\s*['"]?([a-zA-Z0-9_-]{8,})['"]?/i,
                            /token\s*[:=]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/i,
                        ];
                        for (const pattern of secretPatterns) {
                            if (pattern.test(content)) {
                                result.errors.push(`Potential hardcoded secret found in ${file}`);
                                result.pass = false;
                            }
                        }
                    } catch (e) {
                        // Skip binary files
                    }
                }
            }
        };
        scanForSecrets(tempDir);

        const lockFiles = ['package-lock.json', 'yarn.lock', 'poetry.lock', 'requirements.txt.lock'];
        const hasLock = lockFiles.some(file => fs.existsSync(path.join(tempDir, file)));
        if (!hasLock) {
            result.warnings.push('No dependency lock file found');
        }

        if (fs.existsSync(path.join(tempDir, 'SECURITY.md'))) {
            result.warnings.push('SECURITY.md found - security policy present');
        }

    } catch (error) {
        result.errors.push(`Failed to clone or validate repository: ${error}`);
        result.pass = false;
    } finally {
        // Clean up
        try {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        } catch (e) {
            // Ignore cleanup errors
        }
    }

    return result;
}