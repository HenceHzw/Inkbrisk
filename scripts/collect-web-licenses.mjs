import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const inventory = JSON.parse(
  execFileSync('pnpm', ['licenses', 'list', '--prod', '--json'], {
    encoding: 'utf8',
  })
)
const packagePaths = new Set(
  Object.values(inventory)
    .flat()
    .flatMap((entry) => entry.paths)
)
// SWC can insert imports of these helpers into the generated application code.
packagePaths.add('node_modules/@swc/helpers')

const packages = [...packagePaths].map((path) => ({
  path,
  metadata: JSON.parse(readFileSync(join(path, 'package.json'), 'utf8')),
}))
const micromark = packages.find(({ metadata }) => metadata.name === 'micromark')
const notices = new Map()

for (const { path, metadata } of packages) {
  const label = `${metadata.name}@${metadata.version}`
  const files = readdirSync(path, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        /^(licen[sc]es?|notice|copying|copyright)(?:-[\w-]+)?(?:\.(?:txt|md|html))?$/i.test(
          entry.name
        )
    )
    .map((entry) => join(path, entry.name))
  // These micromark npm packages omit the shared MIT license from their tarballs.
  const repository =
    typeof metadata.repository === 'string' ? metadata.repository : metadata.repository?.url
  if (
    files.length === 0 &&
    micromark &&
    metadata.license === 'MIT' &&
    repository?.startsWith('https://github.com/micromark/micromark/tree/main/packages/')
  ) {
    files.push(join(micromark.path, 'license'))
  }
  const texts = files.map((file) => readFileSync(file, 'utf8').trim()).filter(Boolean)
  if (texts.length === 0) {
    throw new Error(`No license or notice found for ${label}`)
  }
  for (const text of texts) {
    if (!notices.has(text)) {
      notices.set(text, new Set())
    }
    notices.get(text).add(label)
  }
}

const sections = [...notices].map(([text, packages]) => [[...packages].sort().join(', '), text])
sections.push([
  'Prebundled Web components',
  readFileSync('licenses/WEB-EMBEDDED.txt', 'utf8').trim(),
])
sections.push(['KaTeX fonts', readFileSync('licenses/KATEX-FONTS.txt', 'utf8').trim()])
// The mhchem extension has its own license header in the KaTeX source.
sections.push([
  'KaTeX mhchem',
  'Copyright (c) 2011-2015 The MathJax Consortium\n' +
    'Copyright (c) 2015-2018 Martin Hensel\n\n' +
    readFileSync('licenses/APACHE-2.0.txt', 'utf8').trim(),
])
sections.sort(([a], [b]) => a.localeCompare(b, 'en'))
const output = [
  'Inkbrisk dependency license notices (including type declarations and prebundled code)',
  ...sections.map((section) => section.join('\n\n')),
]
writeFileSync(
  'dist/WEB-LICENSES.txt',
  output.join('\n\n------------------------------------------------------------------------\n\n') +
    '\n'
)
