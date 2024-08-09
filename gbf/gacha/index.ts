import fs from 'node:fs/promises'
import list from './list.json'
import ratio1 from './ratio1.json'
import ratio2 from './ratio2.json'

const data = { list, ratio1, ratio2 }

fs.writeFile('./gbf/gacha/gbf_gacha_info.json', JSON.stringify(data)).then(() => {
  console.log('成功！')
})
