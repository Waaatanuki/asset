import fsPromises from 'node:fs/promises'
import dotenv from 'dotenv'
import dayjs from 'dayjs'
import Quest from 'gbf/quest.json'

(async () => {
  const env = dotenv.config().parsed
  const TARGET_ITEM_KEY = ['10_215']
  if (!env) {
    console.log('请先添加环境变量')
    return
  }
  const startDate = '2024-03-05'
  const endDate = dayjs().format('YYYY-MM-DD')
  const targetQuest = Quest.filter(q => TARGET_ITEM_KEY.includes(q.targetItemKey))
  const diffDays = dayjs(endDate).diff(startDate, 'day')

  const res: GlobalData[] = targetQuest.map(q => ({
    ...q,
    data: [],
  }))

  for (let index = 0; index < diffDays + 1; index++) {
    const date = dayjs(startDate).add(index, 'day').format('YYYY-MM-DD')

    const dayData = targetQuest.map(q => ({
      questId: q.questId,
      date,
      targetItemCount: 0,
      total: 0,
      blueChest: 0,
    }))

    const body = JSON.stringify({
      questId: targetQuest.map(q => q.questId),
      dateRange: [date, date],
    })

    const resp = await fetch(`${env.BASE_API}/gbf/reward/battle/search`, {
      headers: { 'Content-Type': 'application/json' },
      method: 'post',
      body,
    })

    const { list } = await resp.json()

    for (let i = list.length - 1; i >= 0; i--) {
      const dropInfo: DropInfo = list[i]

      const hitQuest = dayData.find(quest => quest.questId === dropInfo.questId)

      if (!hitQuest)
        continue

      hitQuest.total++
      dropInfo.reward.forEach((treasure) => {
        treasure.box === '11' && hitQuest.blueChest++
        TARGET_ITEM_KEY.includes(treasure.key) && hitQuest.targetItemCount++
      })
    }
    console.log(`完成${date}统计`)

    dayData.forEach((d) => {
      const hit = res.find(q => q.questId === d.questId)
      const _d: any = { ...d }
      delete _d.questId
      hit?.data.push(_d)
    })
  }

  fsPromises.writeFile('./gbf/drop/eternitySand/global.json', JSON.stringify({ updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss'), data: res }))
})()

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
