const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
fs.mkdirSync(path.join(dist, 'assets'), {recursive: true});
esbuild.buildSync({
  entryPoints: [path.join(root, 'source/app.js')],
  bundle: true,
  format: 'iife',
  target: ['es2017', 'chrome61'],
  outfile: path.join(dist, 'app.js')
});
for (const name of ['index.html', 'style.css', 'share-card.js']) {
  fs.copyFileSync(path.join(root, 'source', name), path.join(dist, name));
}
fs.copyFileSync(path.join(root, 'scripts/platform.js'), path.join(dist, 'platform.js'));
fs.copyFileSync(path.join(root, 'assets/share-hero-reconstructed.jpg'), path.join(dist, 'assets/share-hero-reconstructed.jpg'));
fs.writeFileSync(path.join(dist, 'mini_tool.json'), '{"is_high_consumption_scene":false}\n');
for (const name of ['index.html', 'style.css', 'share-card.js', 'platform.js', 'app.js', 'mini_tool.json']) {
  fs.copyFileSync(path.join(dist, name), path.join(root, name));
}
console.log('Built reconstructed candidate in dist/ and synchronized GitHub Pages files.');
