import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(__dirname, '../src')

test('Frontend canonical 5-hospital registry matches backend IDs and names', () => {
  const themeSource = fs.readFileSync(path.join(srcDir, 'lib/hospital-themes.ts'), 'utf8')
  const expectedIds = [
    'hospital-kl',
    'hospital-penang',
    'hospital-jb',
    'hospital-kuching',
    'hospital-kk',
  ]
  for (const id of expectedIds) {
    assert.equal(themeSource.includes(`'${id}'`), true, `Missing hospital ID ${id}`)
  }
  assert.equal(themeSource.includes('hospital-sarawak'), false)
  assert.equal(themeSource.includes('hospital-sabah'), false)
})

test('Frontend source tree contains zero broken dynamic Tailwind class interpolations', () => {
  const dynamicTailwindPattern = /(?:bg|text|border|from|to|via|ring)-\$\{/
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const files = []
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) files.push(...walk(full))
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) files.push(full)
    }
    return files
  }

  for (const file of walk(srcDir)) {
    const content = fs.readFileSync(file, 'utf8')
    assert.equal(
      dynamicTailwindPattern.test(content),
      false,
      `Found dynamic Tailwind class interpolation in ${path.relative(srcDir, file)}`
    )
    assert.equal(
      content.includes('border-l-3') || content.includes('h-13'),
      false,
      `Found invalid Tailwind utility class in ${path.relative(srcDir, file)}`
    )
  }
})

test('Frontend auth storage uses single medlink-auth Zustand store without duplicate localStorage writes', () => {
  const appSource = fs.readFileSync(path.join(srcDir, 'App.tsx'), 'utf8')
  const apiSource = fs.readFileSync(path.join(srcDir, 'lib/api.ts'), 'utf8')
  const verifySource = fs.readFileSync(path.join(srcDir, 'pages/HospitalVerification.tsx'), 'utf8')

  assert.equal(appSource.includes("localStorage.getItem('medlink-user')"), false)
  assert.equal(apiSource.includes("localStorage.getItem('medlink-token')"), false)
  assert.equal(verifySource.includes("localStorage.getItem('medlink-user')"), false)
})
