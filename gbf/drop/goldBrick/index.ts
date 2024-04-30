import fsPromises from 'node:fs/promises'
import dotenv from 'dotenv'
import dayjs from 'dayjs'

(async () => {
  const env = dotenv.config().parsed
  const TARGET_ITEM_KEY = ['17_20004']
  console.log(env)

  if (!env) {
    console.log('请先添加环境变量')
    return
  }
  const questResp = await fetch(`${env.BASE_ADMIN_API}/ext/quest`, {
    method: 'get',
  })
  const { data: Quest }: { data: Quest[] } = await questResp.json()

  const startDate = '2022-03-09'
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
      total: 0,
      blueChest: 0,
      redChestFFJ: 0,
      blueChestFFJ: 0,
      normalChestFFJ: 0,
      ring1: 0,
      ring2: 0,
      ring3: 0,
    }))

    const body = JSON.stringify({
      questId: targetQuest.map(q => q.questId),
      dateRange: [date, date],
    })

    const resp = await fetch(`${env.BASE_RESOURCE_API}/gbf/reward/battle/search`, {
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
        if (TARGET_ITEM_KEY.includes(treasure.key)) {
          treasure.box === '3' && hitQuest.normalChestFFJ++
          treasure.box === '4' && hitQuest.redChestFFJ++
          treasure.box === '11' && hitQuest.blueChestFFJ++
        }

        if (treasure.box === '11') {
          hitQuest.blueChest++
          treasure.key === '73_1' && hitQuest.ring1++
          treasure.key === '73_2' && hitQuest.ring2++
          treasure.key === '73_3' && hitQuest.ring3++
        }
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

  fsPromises.writeFile('./gbf/drop/goldBrick/global.json', JSON.stringify({ updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss'), data: res }))
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
