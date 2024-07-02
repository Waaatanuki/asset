import fsPromises from 'node:fs/promises'

const TARGET_ITEM_KEY = ['17_20004']

async function main(questList: Quest[], startDate: string, updateTime: string) {
  const text = await fsPromises.readFile('./gbf/drop/goldBrick/global.json', { encoding: 'utf-8' })
  let res: GlobalData[] = JSON.parse(text).data ?? []

  if (res.length === 0)
    res = questList.map(q => ({ ...q, data: [] }))

  res.forEach((quest) => {
    const hitIndex = quest.data.findIndex(d => d.date === startDate)
    if (hitIndex !== -1)
      quest.data.splice(hitIndex)
  })

  return function analytics(date: string, battles: DropInfo[], isFinish: boolean) {
    res.forEach((quest) => {
      quest.data.push({
        date,
        total: 0,
        blueChest: 0,
        redChestFFJ: 0,
        blueChestFFJ: 0,
        normalChestFFJ: 0,
        ring1: 0,
        ring2: 0,
        ring3: 0,
      })
    })

    for (let i = battles.length - 1; i >= 0; i--) {
      const dropInfo: DropInfo = battles[i]

      const hitQuest = res.find(quest => quest.questId === dropInfo.questId)

      if (!hitQuest)
        continue

      const currentDayData = hitQuest.data.at(-1)!

      currentDayData.total++
      dropInfo.reward.forEach((treasure) => {
        if (TARGET_ITEM_KEY.includes(treasure.key)) {
          treasure.box === '3' && currentDayData.normalChestFFJ++
          treasure.box === '4' && currentDayData.redChestFFJ++
          treasure.box === '11' && currentDayData.blueChestFFJ++
        }

        if (treasure.box === '11') {
          currentDayData.blueChest++
          treasure.key === '73_1' && currentDayData.ring1++
          treasure.key === '73_2' && currentDayData.ring2++
          treasure.key === '73_3' && currentDayData.ring3++
        }
      })
    }

    if (isFinish)
      fsPromises.writeFile('./gbf/drop/goldBrick/global.json', JSON.stringify({ updateTime, data: res }))
  }
}

export default { main, TARGET_ITEM_KEY }
interface DropInfo {
  accountToken: string
  battleId: string
  questId?: string
  questName: string
  uid: string
  timestamp: number
  reward: Treasure[]
}

interface Treasure {
  box: string
  key: string
  count: number
}

interface GlobalData {
  questId: string
  questName: string
  isBlueBox: boolean
  isBlueTreasure: boolean
  targetItemKey: string
  data: {
    date: string
    total: number
    blueChest: number
    redChestFFJ: number
    blueChestFFJ: number
    normalChestFFJ: number
    ring1: number
    ring2: number
    ring3: number
  }[]
}

interface Quest {
  questId: string
  questName: string
  isBlueBox: boolean
  isBlueTreasure: boolean
  targetItemKey: string
}
