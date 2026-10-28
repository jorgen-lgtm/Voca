// Preview-only review command. All database tests use a disposable local engine.
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status || 1)
}
run('npm', ['ci', '--ignore-scripts', '--include=dev'])
run('npm', ['install', '--no-save', '--package-lock=false', '--ignore-scripts', '--include=dev', '@electric-sql/pglite@0.3.14'])
const audit = spawnSync('npm', ['audit', '--package-lock-only', '--json'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
try {
  const data = JSON.parse(audit.stdout)
  console.log('AUDIT_SUMMARY', JSON.stringify(data.metadata?.vulnerabilities))
  for (const [name, issue] of Object.entries(data.vulnerabilities || {})) {
    if (['high', 'critical'].includes(issue.severity)) console.log('AUDIT_PACKAGE', name, issue.severity, 'direct=' + issue.isDirect, 'fix=' + JSON.stringify(issue.fixAvailable), 'via=' + JSON.stringify(issue.via))
  }
} catch { console.log('AUDIT_UNAVAILABLE') }
run(process.execPath, ['scripts/check-beta.cjs'])
run(process.execPath, ['scripts/check-voice-pitch.cjs', '--with-detector'])
run(process.execPath, ['scripts/check-beta-sql.cjs'])
const lint = spawnSync(process.execPath, ['node_modules/eslint/bin/eslint.js', '.', '--format', 'json'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
try {
  const results = JSON.parse(lint.stdout)
  const errors = results.reduce((n, file) => n + file.errorCount, 0)
  const warnings = results.reduce((n, file) => n + file.warningCount, 0)
  console.log(`LINT_SUMMARY errors=${errors} warnings=${warnings}; lint is reported separately from build`)
  for (const file of results) {
    for (const message of file.messages.filter(message => message.severity === 2).slice(0, 5)) {
      console.log(`LINT_ERROR ${file.filePath.replace(process.cwd() + '/', '')}:${message.line} ${message.ruleId}: ${message.message.split('\n')[0]}`)
    }
  }
  fs.writeFileSync('/tmp/voca-beta-lint.json', lint.stdout)
} catch { console.log('LINT_UNAVAILABLE', lint.status, lint.stderr) }
run('npm', ['run', 'build'])
