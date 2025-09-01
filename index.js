#!/usr/bin/env node
import inquirer from 'inquirer';
import clipboardy from 'clipboardy';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// Default folders to exclude
const DEFAULT_EXCLUDE = ['node_modules', '.git', '.idea'];

// Map extensions to attractive icons
const EXT_ICONS = {
    js: '📜',       // scroll for JavaScript
    ts: '📘',       // blue book for TypeScript
    json: '🧾',     // receipt / structured data for JSON
    html: '💻',     // laptop for HTML
    jsx: '⚛️',      // atom / React logo for JSX
    css: '🎨',      // palette for CSS
    md: '📖',       // open book for markdown
    png: '🖼️',      // framed picture for images
    jpg: '🖼️',
    jpeg: '🖼️',
    gif: '🎞️',     // film strip for gifs
    no_ext: '📄',   // default page
    default: '📄'   // fallback
};

// Get icon for file extension
function getIcon(fileName) {
    const ext = path.extname(fileName).slice(1) || 'no_ext';
    return EXT_ICONS[ext] || EXT_ICONS.default;
}

// Recursive function to print tree like VSCode
function printTree(dir, indent = '') {
    const items = fs.readdirSync(dir).filter(i => !DEFAULT_EXCLUDE.includes(i));
    items.forEach((item) => {
        const fullPath = path.join(dir, item);
        const isDir = fs.statSync(fullPath).isDirectory();
        if (isDir) {
            console.log(indent + '> ' + chalk.blue('📁 ' + item)); // Folder icon
            printTree(fullPath, indent + '    '); // indent nested items
        } else {
            console.log(indent + '    ' + getIcon(item) + ' ' + item); // File icon
        }
    });
}

// Collect files recursively
function collectFiles(dir, exclude = DEFAULT_EXCLUDE) {
    let fileList = [];
    const items = fs.readdirSync(dir).filter(item => !exclude.includes(item));
    items.forEach(item => {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            fileList = fileList.concat(collectFiles(fullPath, exclude));
        } else {
            fileList.push(fullPath);
        }
    });
    return fileList;
}

// Interactive copy
async function interactiveCopy(excludeFolders = DEFAULT_EXCLUDE) {
    const cwd = process.cwd();
    console.log(chalk.bold.green(`\n📂 Current Directory: ${cwd}\n`));

    // Print tree for reference
    printTree(cwd);

    const files = collectFiles(cwd, excludeFolders);

    if (files.length === 0) {
        console.log(chalk.yellow("⚠️ No files found to copy."));
        return;
    }

    const choices = files.map(f => {
        const relative = path.relative(cwd, f);
        const icon = getIcon(f);
        const depth = relative.split(path.sep).length - 1;
        const indent = '  '.repeat(depth);
        return { name: `${indent}${icon} ${relative}`, value: f };
    });

    // Add select all / deselect all
    choices.unshift(new inquirer.Separator('────────────'));
    choices.unshift({ name: '✅ Select All', value: '__select_all' });
    choices.push({ name: '❌ Deselect All', value: '__deselect_all' });
    choices.push(new inquirer.Separator('────────────'));

    let selectedFiles = [];
    let done = false;

    while (!done) {
        const answer = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'files',
                message: 'Select files to copy content:',
                choices: choices,
                pageSize: 15
            }
        ]);

        if (answer.files.includes('__select_all')) {
            selectedFiles = files.slice();
            done = true;
        } else if (answer.files.includes('__deselect_all')) {
            selectedFiles = [];
            done = true;
        } else {
            selectedFiles = answer.files;
            done = true;
        }

        if (selectedFiles.length === 0) {
            console.log(chalk.yellow("⚠️ No files selected. Please select at least one file."));
        }
    }

    console.log(chalk.blue(`\n📋 Copying ${selectedFiles.length} file(s) to clipboard...\n`));

    let combinedContent = "";
    selectedFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        combinedContent += `// ----- ${file} -----\n${content}\n\n`;
    });

    clipboardy.writeSync(combinedContent);
    console.log(chalk.green(`✅ Content of ${selectedFiles.length} file(s) copied to clipboard!\n`));
}


// CLI arguments
const args = process.argv.slice(2);
let copyMode = false;
let excludeFolders = DEFAULT_EXCLUDE;

args.forEach((arg, index) => {
    if (arg === "-c" || arg === "--copy") copyMode = true;
    if (arg === "-e" || arg === "--exclude") {
        if (args[index + 1]) excludeFolders = args[index + 1].split(",");
    }
});

if (copyMode) {
    interactiveCopy(excludeFolders).catch(err => console.error(err));
} else {
    console.log(chalk.bold(process.cwd()));
    printTree(process.cwd());
}
