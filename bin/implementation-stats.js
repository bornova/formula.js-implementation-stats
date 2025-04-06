import { writeFileSync } from 'fs'
import { JSDOM } from 'jsdom'
import * as formulajs from '@formulajs/formulajs'

const URL =
  'https://support.microsoft.com/en-us/office/excel-functions-alphabetical-b3944572-255d-4efb-bb96-c6d90033e188'

/**
 * Recursively flattens the methods of an object into a list of method names.
 */
function flattenFormulas(obj, prefix = '', visited = new WeakSet()) {
  if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return []
  if (visited.has(obj)) return []
  visited.add(obj)

  return Object.keys(obj).reduce((methodNames, key) => {
    const value = obj[key]
    const path = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'function') {
      methodNames.push(path)
    }

    if (value && (typeof value === 'object' || typeof value === 'function')) {
      methodNames.push(...flattenFormulas(value, path, visited))
    }

    return methodNames
  }, [])
}

/**
 * Generates a Markdown table from the stats array.
 */
function generateMarkdownTable(stats) {
  const pageTitle = `## Excel functions implemented in Formula.js\nAs of ${new Date().toUTCString()} \n\n`
  const tableHeader = ` | Function Name | Category | Description | Implemented |\n | :--- | :--- | :--- | :--- |\n`
  const tableRows = stats
    .map(
      (stat) => ` | ${stat.name} | ${stat.category} | ${stat.description} | ${stat.implemented ? '\u2705' : '\u274c'} |`
    )
    .join('\n')

  return pageTitle + tableHeader + tableRows
}

async function fetchAndProcessData() {
  const stats = []

  try {
    const response = await fetch(URL)
    const data = await response.text()
    const dom = new JSDOM(data)

    const rows = dom.window.document.querySelectorAll('.ocpIntroduction table tbody tr')

    if (!rows.length) {
      throw new Error('No rows found in the table. The webpage structure might have changed.')
    }

    rows.forEach((row) => {
      const cells = row.querySelectorAll('td')
      if (cells.length < 2) return

      const name = cells[0].textContent
        .trim()
        .split(' ')[0]
        .replace(/[a-z]|\,|\n+/g, '')
      const category = cells[1].textContent.trim().split(/:/)[0]
      const desc = cells[1].textContent.trim().split(/:/)
      desc.shift()
      const description = desc.join(':').replace(/\n+/, '. ').replace(/\s+/g, ' ').trim()
      const implemented = flattenFormulas(formulajs).includes(name)

      stats.push({ name, category, description, implemented })
    })

    const table = generateMarkdownTable(stats)

    writeFileSync('IMPLEMENTATION_STATS.md', table)

    console.log('IMPLEMENTATION_STATS.md has been successfully generated.')
  } catch (err) {
    console.error(`Failed to fetch or process data: ${err.message}`)
  }
}

fetchAndProcessData()
