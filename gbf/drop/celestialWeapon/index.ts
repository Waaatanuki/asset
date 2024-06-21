import fsPromises from 'node:fs/promises'
import dotenv from 'dotenv'
import dayjs from 'dayjs'

(async () => {
  const env = dotenv.config().parsed

  if (!env)
    return

  const isBlueBox = false
  const isBlueTreasure = false
  const questResp = await fetch(`${env.BASE_ADMIN_API}/gm/drop/celestialWeapon/quest`, { method: 'get' })
  const { data }: { data: { eventInfo: Event[], targetItem: string[] } } = await questResp.json()

  const eventInfo = data.eventInfo
  const TARGET_ITEM_KEY = data.targetItem

  const lastEvent = eventInfo.at(-1)!
  const startDate = lastEvent.date[0]
  const endDate = lastEvent.date[1]
  const targetQuest = lastEvent.quest.map(q => ({
    ...q,
    isBlueBox,
    isBlueTreasure,
  }))
  const diffDays = dayjs(endDate).diff(startDate, 'day')

  const res: Quest[] = targetQuest.map(q => ({
    ...q,
    targetItemCount: 0,
    total: 0,
    blueChest: 0,
  }))

  for (let index = 0; index < diffDays + 1; index++) {
    const date = dayjs(startDate).add(index, 'day').format('YYYY-MM-DD')

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

      const hitQuest = res.find(quest => quest.questId === dropInfo.questId)

      if (!hitQuest)
        continue

      hitQuest.total++
      dropInfo.reward.forEach((treasure) => {
        treasure.box === '11' && hitQuest.blueChest++
        TARGET_ITEM_KEY.includes(treasure.key) && hitQuest.targetItemCount++
      })
    }
    console.log(`完成${date}统计`)
  }

  fsPromises.readFile('./gbf/drop/celestialWeapon/global.json', { encoding: 'utf8' }).then((data) => {
    const globalData: GlobalData = JSON.parse(data)
    let hit = globalData.data.find(event => event.value === lastEvent.value)
    if (hit)
      hit = { ...lastEvent, quest: res }
    else
      globalData.data.unshift({ ...lastEvent, quest: res })

    globalData.updateTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
    fsPromises.writeFile('./gbf/drop/celestialWeapon/global.json', JSON.stringify(globalData, null, 2))
  })
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
  updateTime: string
  data: {
    value: string
    title: string
    date: string[]
    quest: Quest[]
  }[]
}

interface Quest {
  questId: string
  questName: string
  questImage: string
  isBlueBox: boolean
  isBlueTreasure: boolean
  targetItemCount: number
  total: number
  blueChest: number
}

interface Event {
  value: string
  title: string
  date: string[]
  quest: {
    questId: string
    questName: string
    questImage: string
  }[]
}
