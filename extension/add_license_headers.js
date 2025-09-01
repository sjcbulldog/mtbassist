#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const licenseHeader = `/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

`;

function hasLicenseHeader(content) {
    // Check if file already has Apache license header
    return content.includes('Licensed under the Apache License') || 
           content.includes('Apache License, Version 2.0');
}

function getAllTypeScriptFiles(dir) {
    const files = [];
    
    function walkDir(currentDir) {
        try {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                
                if (entry.isDirectory()) {
                    walkDir(fullPath);
                } else if (entry.name.endsWith('.ts')) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            console.error(`Error reading directory ${currentDir}: ${error.message}`);
        }
    }
    
    walkDir(dir);
    return files;
}

function addLicenseToFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (hasLicenseHeader(content)) {
            console.log(`Skipping ${filePath} - already has license header`);
            return false;
        }

        const newContent = licenseHeader + content;
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Added license header to ${filePath}`);
        return true;
    } catch (error) {
        console.error(`Error processing ${filePath}: ${error.message}`);
        return false;
    }
}

// Get all TypeScript files from both extension and content directories
const extensionFiles = getAllTypeScriptFiles('./src');
const contentFiles = getAllTypeScriptFiles('../content/src');
const allFiles = [...extensionFiles, ...contentFiles];

console.log(`Found ${allFiles.length} TypeScript files`);

let processedCount = 0;
let skippedCount = 0;

// Process each file
allFiles.forEach(filePath => {
    if (addLicenseToFile(filePath)) {
        processedCount++;
    } else {
        skippedCount++;
    }
});

console.log(`\nSummary:`);
console.log(`- Files processed: ${processedCount}`);
console.log(`- Files skipped: ${skippedCount}`);
console.log(`- Total files: ${allFiles.length}`);
console.log('License header addition complete!');
