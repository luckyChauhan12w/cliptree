#!/usr/bin/env node
import inquirer from 'inquirer';
import clipboardy from 'clipboardy';
import fs from 'fs';
import path from 'path';

// Default folders to exclude
const DEFAULT_EXCLUDE = ['node_modules', '.git', '.idea'];

// Function to get folder tree recursively with exclusion
function getTree(dir, prefix = "", exclude = DEFAULT_EXCLUDE) {
    const items = fs.readdirSync(dir).filter(item => !exclude.includes(item));
    let tree = [];

    items.forEach((item, index) => {
        const fullPath = path.join(dir, item);
        const isLast = index === items.length - 1;
        const pointer = isLast ? "└── " : "├── ";
        tree.push(prefix + pointer + item);

        if (fs.statSync(fullPath).isDirectory()) {
            const newPrefix = prefix + (isLast ? "    " : "│   ");
            tree = tree.concat(getTree(fullPath, newPrefix, exclude));
        }
    });

    return tree;
}

// Print tree view
function printTree(excludeFolders = DEFAULT_EXCLUDE) {
    console.log(process.cwd());
    const tree = getTree(process.cwd(), "", excludeFolders);
    tree.forEach(line => console.log(line));
}

// Collect files recursively (ignoring excluded folders)
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
    printTree(excludeFolders); // Show tree first

    const files = collectFiles(process.cwd(), excludeFolders);

    const answers = await inquirer.prompt([
        {
            type: "checkbox",
            name: "selectedFiles",
            message: "Select files to copy content:",
            choices: files
        }
    ]);

    if (answers.selectedFiles.length === 0) {
        console.log("⚠️ No files selected.");
        return;
    }

    // Combine content of all selected files
    let combinedContent = "";
    answers.selectedFiles.forEach(file => {
        const content = fs.readFileSync(file, "utf-8");
        combinedContent += `// ----- ${file} -----\n${content}\n\n`;
    });

    clipboardy.writeSync(combinedContent);
    console.log(`✅ Content of ${answers.selectedFiles.length} file(s) copied to clipboard!`);
}

// CLI arguments with short flags
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
    printTree(excludeFolders);
}
