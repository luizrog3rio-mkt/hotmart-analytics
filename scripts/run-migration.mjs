import { readFileSync } from 'fs'

const PROJECT_ID = 'qttxajnsrrfvcvfvmkxh'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN

if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN not set')
  process.exit(1)
}

const sqlFile = process.argv[2]
if (!sqlFile) {
  console.error('Usage: node run-migration.mjs <path-to-sql>')
  process.exit(1)
}

const sql = readFileSync(sqlFile, 'utf-8')

// Split by semicolons but respect $$ blocks (plpgsql functions)
function splitStatements(sql) {
  const statements = []
  let current = ''
  let inDollarQuote = false

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]
    const next = sql[i + 1]

    if (char === '$' && next === '$') {
      inDollarQuote = !inDollarQuote
      current += '$$'
      i++
      continue
    }

    if (char === ';' && !inDollarQuote) {
      const stmt = current.trim()
      if (stmt && !stmt.startsWith('--')) {
        statements.push(stmt + ';')
      }
      current = ''
      continue
    }

    current += char
  }

  return statements
}

const statements = splitStatements(sql)
console.log(`Found ${statements.length} SQL statements to execute\n`)

let success = 0
let failed = 0

for (const stmt of statements) {
  const preview = stmt.slice(0, 80).replace(/\n/g, ' ')
  process.stdout.write(`  ${preview}... `)

  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: stmt }),
    })

    const body = await res.text()

    if (!res.ok) {
      // Try to parse error
      let errMsg = body
      try { errMsg = JSON.parse(body).message || body } catch {}
      console.log(`FAIL (${res.status}: ${errMsg.slice(0, 120)})`)
      failed++
    } else {
      console.log('OK')
      success++
    }
  } catch (err) {
    console.log(`ERROR: ${err.message}`)
    failed++
  }
}

console.log(`\nDone: ${success} succeeded, ${failed} failed out of ${statements.length}`)
