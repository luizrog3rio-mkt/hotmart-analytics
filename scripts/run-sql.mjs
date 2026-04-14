import { readFileSync } from 'fs'

const PROJECT_ID = 'qttxajnsrrfvcvfvmkxh'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN

const sqlFile = process.argv[2]
const sql = readFileSync(sqlFile, 'utf-8')

console.log(`Executing ${sqlFile} (${sql.length} bytes)...`)

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
})

const body = await res.text()
if (!res.ok) {
  console.error(`FAILED (${res.status}):`, body)
  process.exit(1)
}
console.log('SUCCESS:', body.slice(0, 200))
