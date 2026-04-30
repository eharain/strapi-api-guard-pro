const fs = require('fs');
const path = require('path');

const scriptsDir = __dirname;
const targetDir = path.dirname(scriptsDir);
const outputPath = path.join(scriptsDir, 'plugin-combined.txt');

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.cache', '.vs','.github','scripts'];
const EXCLUDE_FILES = ['package-lock.json', 'yarn.lock', '.DS_Store', '.tmp_patch_blocks.json','.gitattributes'];
const EXCLUDE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.ttf', '.map'];

console.log('='.repeat(60));
console.log('🧠 API PERMISSION GENIUS - FILE COMBINER');
console.log('='.repeat(60));
console.log(`Target: ${targetDir}`);
console.log(`Output: ${outputPath}`);
console.log('='.repeat(60));
console.log('');

function shouldExclude(filePath, fileName) {
    if (EXCLUDE_FILES.includes(fileName)) return true;
    const ext = path.extname(fileName).toLowerCase();
    if (EXCLUDE_EXTENSIONS.includes(ext)) return true;
    if (filePath.includes('/scripts/') || filePath.includes('\\scripts\\')) return true;
    for (const dir of EXCLUDE_DIRS) {
        if (filePath.includes(`/${dir}/`) || filePath.includes(`\\${dir}\\`)) return true;
    }
    return false;
}

function getAllFiles(dirPath, results = []) {
    try {
        const items = fs.readdirSync(dirPath);

        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                getAllFiles(fullPath, results);
            } else {
                if (!shouldExclude(fullPath, item)) {
                    results.push({
                        path: fullPath,
                        relative: path.relative(targetDir, fullPath)
                    });
                }
            }
        }
    } catch (err) {
        console.error(`Error reading ${dirPath}:`, err.message);
    }

    return results;
}

console.log('Scanning files...');
const allFiles = getAllFiles(targetDir);
console.log(`Found ${allFiles.length} files`);

console.log('Writing to output file...');
let outputContent = '';
outputContent += '='.repeat(80) + '\n';
outputContent += '🧠 API PERMISSION GENIUS - COMPLETE PLUGIN FILES\n';
outputContent += '='.repeat(80) + '\n';
outputContent += `Generated: ${new Date().toLocaleString()}\n`;
outputContent += `Total Files: ${allFiles.length}\n`;
outputContent += '='.repeat(80) + '\n\n';

let count = 0;
for (const file of allFiles) {
    try {
        const content = fs.readFileSync(file.path, 'utf8');
        outputContent += '\n' + '='.repeat(80) + '\n';
        outputContent += `📄 FILE: ${file.relative}\n`;
        outputContent += '='.repeat(80) + '\n\n';
        outputContent += content + '\n';

        count++;
        if (count % 100 === 0) {
            console.log(`Processed ${count}/${allFiles.length} files...`);
        }
    } catch (err) {
        console.log(`Skipped ${file.relative}: ${err.message}`);
    }
}

fs.writeFileSync(outputPath, outputContent);
console.log('');
console.log('='.repeat(60));
console.log(`✅ COMPLETE! Processed ${count} files`);
console.log(`📄 Output: ${outputPath}`);
const stats = fs.statSync(outputPath);
console.log(`📏 Size: ${(stats.size / 1024).toFixed(2)} KB`);
console.log('='.repeat(60));