const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else if (filePath.endsWith('.js')) {
            results.push(filePath);
        }
    }
    return results;
}

const files = walk(path.join(__dirname, 'src'));
let errors = [];

for (const file of files) {
    try {
        const code = fs.readFileSync(file, 'utf-8');
        parser.parse(code, {
            sourceType: "module",
            plugins: ["jsx", "flow"]
        });
    } catch (e) {
        errors.push(`File: ${file}\nError: ${e.message}`);
    }
}

if (errors.length > 0) {
    fs.writeFileSync('d:\\Traffic_Eye\\syntax_errors_new.txt', "=== SYNTAX ERRORS FOUND ===\n" + errors.join("\n\n"), 'utf-8');
} else {
    fs.writeFileSync('d:\\Traffic_Eye\\syntax_errors_new.txt', "No syntax errors found.", 'utf-8');
}

