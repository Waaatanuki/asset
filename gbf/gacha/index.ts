import { readFile, writeFile } from 'node:fs/promises'
import { load } from 'cheerio'
import list from './list.json'
import ratio1 from './ratio1.json'
import ratio2 from './ratio2.json'

const data = { list, ratio1, ratio2 }

await writeFile('./gbf/gacha/gbf_gacha_info.json', JSON.stringify(data))

const domStr = await readFile('./gbf/gacha/content.txt', { encoding: 'utf-8' })
const htmlString = decodeURIComponent(domStr)
const $ = load(htmlString)
const characterId: string[] = []
$(`.img-open-character`).each((i, el) => {
  characterId.push(el.attribs.alt)
})

await writeFile('./gbf/gacha/character_list.json', JSON.stringify(characterId))
