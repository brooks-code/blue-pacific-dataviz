// build.js
const { build } = require('esbuild');
const { sassPlugin } = require('esbuild-sass-plugin');

build({
  entryPoints: ['src/app.js', 'src/index.html'],
  bundle: true,
  outdir: 'dist',
  minify: true,
  sourcemap: true,

  // default format is 'cjs', platform is 'node' (unless overriden)
  plugins: [sassPlugin()],
  loader: {
    '.html': 'copy',
    '.json': 'json',
    '.ico': 'file'
  }
}).catch(() => process.exit(1));
