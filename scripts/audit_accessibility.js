/* eslint-env node */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const root = path.resolve(__dirname, '..');
const srcRoot = path.join(root, 'src');
const interactive = new Set(['TouchableOpacity', 'Pressable', 'PressableScale', 'Button']);
const findings = [];

function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== '__tests__') walk(fullPath);
        } else if (entry.name.endsWith('.js')) audit(fullPath);
    }
}

function audit(file) {
    const source = fs.readFileSync(file, 'utf8');
    const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
    traverse(ast, {
        JSXOpeningElement(nodePath) {
            const name = nodePath.node.name?.name;
            if (!interactive.has(name)) return;
            const names = new Set(nodePath.node.attributes.filter(attribute => attribute.type === 'JSXAttribute').map(attribute => attribute.name.name));
            const missing = [];
            if (!names.has('accessibilityLabel')) missing.push('label');
            if (name !== 'Button' && !names.has('accessibilityRole')) missing.push('role');
            if (missing.length) findings.push(`${path.relative(root, file)}:${nodePath.node.loc.start.line} ${name} missing ${missing.join('+')}`);
        },
    });
}

walk(srcRoot);
process.stdout.write(`Interactive accessibility findings: ${findings.length}\n${findings.join('\n')}\n`);
process.exitCode = findings.length ? 1 : 0;
