const fs = require('fs');
const path = require('path');

const clientSrcDir = path.join(__dirname, 'client', 'src');

function findRelativePathToConfig(filePath) {
    const relativePath = path.relative(path.dirname(filePath), path.join(clientSrcDir, 'config'));
    return relativePath.startsWith('.') ? relativePath : './' + relativePath;
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('http://localhost:5000')) {
                console.log(`Updating ${fullPath}`);
                
                // Add import statement if not already there
                if (!content.includes('API_BASE_URL')) {
                    const relativeConfigPath = findRelativePathToConfig(fullPath).replace(/\\/g, '/');
                    const importStatement = `import { API_BASE_URL } from '${relativeConfigPath}';\n`;
                    content = importStatement + content;
                }

                // Replace template literals `http://localhost:5000/api/...`
                content = content.replace(/`http:\/\/localhost:5000(\/[^`]*)`/g, '`${API_BASE_URL}$1`');
                
                // Replace string literals 'http://localhost:5000/api/...'
                content = content.replace(/'http:\/\/localhost:5000(\/[^']*)'/g, 'API_BASE_URL + \'$1\'');
                
                // Replace string literals "http://localhost:5000/api/..."
                content = content.replace(/"http:\/\/localhost:5000(\/[^"]*)"/g, 'API_BASE_URL + "$1"');

                // For cases like http://localhost:5000 without path
                content = content.replace(/'http:\/\/localhost:5000'/g, 'API_BASE_URL');
                content = content.replace(/"http:\/\/localhost:5000"/g, 'API_BASE_URL');
                content = content.replace(/`http:\/\/localhost:5000`/g, 'API_BASE_URL');

                fs.writeFileSync(fullPath, content, 'utf8');
            }
        }
    }
}

processDirectory(clientSrcDir);
console.log('Update complete.');
