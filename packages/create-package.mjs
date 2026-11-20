#!/usr/bin/env node
/**
 * Génère un nouveau package dans le monorepo.
 *
 * Usage:
 *   node packages/create-package.mjs --path <package-path> [--src <src-path>]
 *
 * Options:
 *   --path, -p   Chemin relatif depuis packages/ (ex: "three/material/my-lib")  [REQUIS]
 *   --src,  -s   Chemin vers les fichiers à copier dans src/                    [optionnel]
 *   --help, -h   Affiche cette aide
 *
 * Exemples:
 *   node packages/create-package.mjs --path three/material/my-lib
 *   node packages/create-package.mjs --path algorithme/my-algo --src ./src/components/common/myLib
 *   node packages/create-package.mjs -p ui/buttons -s ./src/components/buttons
 */

import { existsSync, mkdirSync, writeFileSync, cpSync, readFileSync, readdirSync } from 'fs'
import { resolve, dirname, basename, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = resolve(__dirname, '..')

// ── Help ──────────────────────────────────────────────────────────────────────
const HELP = `
Usage:
  node packages/create-package.mjs --path <package-path> [--src <src-path>]

Options:
  --path, -p   Chemin relatif depuis packages/ (ex: "three/material/my-lib")  [REQUIS]
  --src,  -s   Chemin vers les fichiers à copier dans src/                    [optionnel]
  --help, -h   Affiche cette aide

Exemples:
  node packages/create-package.mjs --path three/material/my-lib
  node packages/create-package.mjs --path algorithme/my-algo --src ./src/components/common/myLib
  node packages/create-package.mjs -p ui/buttons -s ./src/components/buttons
`

// ── Parser les arguments nommés ───────────────────────────────────────────────
function parseArgs(argv) {
  const args = {}
  const raw = argv.slice(2)
  for (let i = 0; i < raw.length; i++) {
    const token = raw[i]
    const next  = raw[i + 1]
    if (token === '--help' || token === '-h') {
      args.help = true
    } else if ((token === '--path' || token === '-p') && next && !next.startsWith('-')) {
      args.path = next; i++
    } else if ((token === '--src' || token === '-s') && next && !next.startsWith('-')) {
      args.src = next; i++
    } else if (!token.startsWith('-') && !args.path) {
      args.path = token
    } else if (!token.startsWith('-') && args.path && !args.src) {
      args.src = token
    }
  }
  return args
}

// ── Auto-générer index.ts depuis les fichiers src/ ────────────────────────────
function generateIndex(srcDir, npmName) {
  const EXCLUDED_SUFFIXES = ['.stories.tsx', '.stories.ts', '.test.tsx', '.test.ts', '.spec.ts', '.spec.tsx']

  const files = readdirSync(srcDir).filter(f => {
    const ext = extname(f)
    if (ext !== '.ts' && ext !== '.tsx') return false
    if (f === 'index.ts' || f === 'index.tsx') return false
    if (EXCLUDED_SUFFIXES.some(s => f.endsWith(s))) return false
    return true
  })

  if (files.length === 0) return `// ${npmName}\n`

  const exports = files
    .map(f => `export * from './${f.replace(/\.tsx?$/, '')}'`)
    .join('\n')

  return `// ${npmName}\n${exports}\n`
}

// ── Main ──────────────────────────────────────────────────────────────────────
const args = parseArgs(process.argv)

if (args.help || process.argv.length <= 2) { console.log(HELP); process.exit(0) }
if (!args.path) {
  console.error('❌ Le paramètre --path est requis.')
  console.log(HELP)
  process.exit(1)
}

const packagePath   = args.path.replace(/\\/g, '/')
const srcPath       = args.src
const packageDir    = resolve(__dirname, packagePath)
const packageName   = basename(packagePath)
const npmName       = `@electron-three-boiler/${packageName}`
const libName       = packageName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
const workspacePath = `packages/${packagePath}`
const tsconfigRef   = `./${workspacePath}`
const scriptBase    = packageName
const parentDir     = packagePath.split('/').slice(0, -1).join('/')
const parentGlob    = parentDir ? `packages/${parentDir}/*` : 'packages/*'

if (existsSync(packageDir)) {
  console.error(`❌ Le dossier existe déjà : ${packageDir}`)
  process.exit(1)
}

console.log(`\n📦 Création du package ${npmName}`)
console.log(`   Dossier  : ${packageDir}`)
if (srcPath) console.log(`   Source   : ${resolve(process.cwd(), srcPath)}`)
console.log()

// ── Créer les dossiers ────────────────────────────────────────────────────────
mkdirSync(resolve(packageDir, 'src'), { recursive: true })

// ── package.json ──────────────────────────────────────────────────────────────
writeFileSync(
  resolve(packageDir, 'package.json'),
  JSON.stringify({
    name: npmName,
    version: '0.1.0',
    type: 'module',
    main: './dist/index.js',
    types: './dist/index.d.ts',
    exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } },
    files: ['dist', 'README.md'],
    scripts: {
      build: 'tsc --build --force tsconfig.json && vite build',
      clean: 'Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue',
    },
    peerDependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
    devDependencies: {
      '@types/react': '^19.2.14',
      '@types/react-dom': '^19.2.3',
      '@vitejs/plugin-react': '^6.0.1',
      typescript: '~6.0.2',
      vite: '^8.0.10',
    },
  }, null, 2) + '\n'
)
console.log('  ✅ package.json')

// ── tsconfig.json ─────────────────────────────────────────────────────────────
writeFileSync(
  resolve(packageDir, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: {
      composite: true, target: 'ES2020', lib: ['ES2020', 'DOM'],
      module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx',
      declaration: true, declarationMap: true, emitDeclarationOnly: true,
      outDir: './dist', rootDir: './src', strict: true,
      skipLibCheck: true, verbatimModuleSyntax: true,
    },
    include: ['src'],
  }, null, 2) + '\n'
)
console.log('  ✅ tsconfig.json')

// ── vite.config.ts ────────────────────────────────────────────────────────────
writeFileSync(resolve(packageDir, 'vite.config.ts'), `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: '${libName}',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'three', '@react-three/fiber', '@react-three/drei'],
      output: {
        globals: { react: 'React', 'react-dom': 'ReactDOM', three: 'THREE' },
      },
    },
  },
})
`)
console.log('  ✅ vite.config.ts')

// ── README.md ─────────────────────────────────────────────────────────────────
writeFileSync(resolve(packageDir, 'README.md'), `# ${npmName}

## Installation

\`\`\`bash
npm install github:username/electron-three-boiler#${npmName}@0.1.0
\`\`\`

## Usage

\`\`\`typescript
import {  } from '${npmName}'
\`\`\`
`)
console.log('  ✅ README.md')

// ── src/ + index.ts auto-généré ───────────────────────────────────────────────
const srcDestDir = resolve(packageDir, 'src')

if (srcPath) {
  const absSrcPath = resolve(process.cwd(), srcPath)
  if (!existsSync(absSrcPath)) {
    console.error(`❌ Le chemin --src n'existe pas : ${absSrcPath}`)
    process.exit(1)
  }
  cpSync(absSrcPath, srcDestDir, { recursive: true })
  console.log(`  ✅ src/ (copié depuis ${absSrcPath})`)
}

// Générer index.ts : si déjà présent après la copie, ne pas écraser
const indexPath = resolve(srcDestDir, 'index.ts')
if (existsSync(indexPath)) {
  console.log('  ✅ src/index.ts (conservé depuis la source)')
} else {
  const indexContent = generateIndex(srcDestDir, npmName)
  writeFileSync(indexPath, indexContent)

  const exportedFiles = readdirSync(srcDestDir).filter(f =>
    (f.endsWith('.ts') || f.endsWith('.tsx')) &&
    f !== 'index.ts' && !f.endsWith('.stories.tsx') && !f.endsWith('.test.ts')
  )
  if (exportedFiles.length > 0) {
    console.log(`  ✅ src/index.ts (auto-généré — ${exportedFiles.length} export(s):)`)
    exportedFiles.forEach(f => console.log(`       export * from './${f.replace(/\.tsx?$/, '')}'`))
  } else {
    console.log('  ✅ src/index.ts (vide — aucun fichier source à exporter)')
  }
}

// ── Mettre à jour root package.json ──────────────────────────────────────────
const rootPkgPath = resolve(ROOT, 'package.json')
const rootPkg     = JSON.parse(readFileSync(rootPkgPath, 'utf-8'))

if (!rootPkg.workspaces.some(w => {
  if (w.endsWith('/*')) {
    return workspacePath.split('/').slice(0, -1).join('/') === w.slice(0, -2)
  }
  return w === workspacePath
})) {
  if (!rootPkg.workspaces.includes(parentGlob)) {
    rootPkg.workspaces.push(parentGlob)
    console.log(`  ✅ root package.json — workspace glob: "${parentGlob}"`)
  }
}

rootPkg.scripts[`version:${scriptBase}`]       = `npm version patch --workspace=${workspacePath}`
rootPkg.scripts[`version:${scriptBase}:minor`] = `npm version minor --workspace=${workspacePath}`
rootPkg.scripts[`version:${scriptBase}:major`] = `npm version major --workspace=${workspacePath}`
rootPkg.scripts[`tag:${scriptBase}`]           = `node -e "const v=require('./${workspacePath}/package.json').version; require('child_process').execSync('git tag ${npmName}@'+v, {stdio:'inherit'})"`

writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n')
console.log(`  ✅ root package.json — scripts version:${scriptBase} / tag:${scriptBase}`)

// ── Mettre à jour root tsconfig.json ─────────────────────────────────────────
const rootTsconfigPath = resolve(ROOT, 'tsconfig.json')
const rootTsconfig     = JSON.parse(readFileSync(rootTsconfigPath, 'utf-8'))

if (!rootTsconfig.references.some(r => r.path === tsconfigRef)) {
  rootTsconfig.references.push({ path: tsconfigRef })
  writeFileSync(rootTsconfigPath, JSON.stringify(rootTsconfig, null, 2) + '\n')
  console.log(`  ✅ root tsconfig.json — référence: "${tsconfigRef}"`)
}

// ── Résumé ────────────────────────────────────────────────────────────────────
console.log(`
✅ Package ${npmName} créé avec succès !

📋 Prochaines étapes:
   npm install
   npm run build --workspace=${workspacePath}

📦 Scripts de release:
   npm run version:${scriptBase}        # patch  0.1.0 → 0.1.1
   npm run version:${scriptBase}:minor  # minor  0.1.0 → 0.2.0
   npm run version:${scriptBase}:major  # major  0.1.0 → 1.0.0
   npm run tag:${scriptBase}            # crée le tag Git
   npm run release                      # git push + tags
`)

