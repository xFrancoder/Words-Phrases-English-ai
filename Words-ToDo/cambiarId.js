import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline/promises'
import { stdin, stdout } from 'node:process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultFile = path.join(__dirname, 'output', 'vocabulary.json')

async function askStartNumber() {
  const rl = readline.createInterface({ input: stdin, output: stdout })
  const answer = await rl.question('Ingrese el número de inicio para el primer id: ')
  rl.close()
  return answer.trim()
}

async function main() {
  const argStart = process.argv[2]
  const argFile = process.argv[3]
  const filePath = argFile ? path.resolve(argFile) : defaultFile

  let startValue = argStart
  if (!startValue) {
    startValue = await askStartNumber()
  }

  const start = Number(startValue)
  if (!Number.isInteger(start) || start < 0) {
    console.error('Error: Debes ingresar un número entero válido mayor o igual a 0.')
    process.exit(1)
  }

  const raw = await fs.readFile(filePath, 'utf8')
  const data = JSON.parse(raw)
  if (!Array.isArray(data)) {
    console.error(`Error: El archivo ${filePath} no contiene un arreglo JSON.`)
    process.exit(1)
  }

  data.forEach((item, index) => {
    item.id = start + index
  })

  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`IDs renumerados desde ${start} en ${filePath}. Total: ${data.length} objetos.`)
}

main().catch((error) => {
  console.error('Error:', error.message)
  process.exit(1)
})

//node cambiarId.js 32 <- id