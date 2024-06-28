import fsPromises from 'node:fs/promises'

const TARGET_ITEM_KEY = ['10_215']

function main(questList: Quest[], updateTime: string) {
  const res: GlobalData[] = questList.map(q => ({
    ...q,
    data: [],
  }))

  return function analytics(date: string, battles: DropInfo[], isFinish: boolean) {
    res.forEach(quest => quest.data.push({
      date,
      targetItemCount: 0,
      total: 0,
      blueChest: 0,
    }))

    for (let i = battles.length - 1; i >= 0; i--) {
      const dropInfo: DropInfo = battles[i]

      const hitQuest = res.find(quest => quest.questId === dropInfo.questId)

      if (!hitQuest)
        continue

      const currentDayData = hitQuest.data.at(-1)!

      currentDayData.total++
      dropInfo.reward.forEach((treasure) => {
        treasure.box === '11' && currentDayData.blueChest++
        TARGET_ITEM_KEY.includes(treasure.key) && currentDayData.targetItemCount++
      })
    }

    if (isFinish)
      fsPromises.writeFile('./gbf/drop/eternitySand/global.json', JSON.stringify({ updateTime, data: res }))
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
    targetItemCount: number
    total: number
    blueChest: number
  }[]
}

interface Quest {
  questId: string
  questName: string
  isBlueBox: boolean
  isBlueTreasure: boolean
  targetItemKey: string
}
