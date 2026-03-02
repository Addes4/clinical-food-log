const { spawnSync } = require('node:child_process')

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: false })
  if (typeof result.status === 'number') {
    process.exit(result.status)
  }
  process.exit(1)
}

try {
  require.resolve('eslint/package.json')
  run('npx', ['next', 'lint'])
} catch {
  console.warn('ESLint not installed; running TypeScript check fallback instead.')
  run('npx', ['tsc', '--noEmit'])
}
