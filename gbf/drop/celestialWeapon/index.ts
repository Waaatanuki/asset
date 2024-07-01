import fsPromises from 'node:fs/promises'
import dotenv from 'dotenv'
import dayjs from 'dayjs'

(async () => {
  const env = dotenv.config().parsed

  if (!env)
    return

  const questResp = await fetch(`${env.BASE_ADMIN_API}/gm/drop/celestialWeapon/quest`, { method: 'get' })
  const { data }: { data: { eventInfo: Event[], targetItem: { revenantWeapon: string[], celestialWeapon: string[] } } } = await questResp.json()

  const eventInfo = data.eventInfo
  const targetItem = data.targetItem

  const lastEvent = eventInfo.at(-1)!
  const startDate = lastEvent.date[0]
  const endDate = lastEvent.date[1]
  const targetQuest = lastEvent.quest

  const diffDays = dayjs(endDate).diff(startDate, 'day')

  const res: Quest[] = targetQuest.map(q => ({
    ...q,
    celestialWeapon: 0,
    revenantWeapon: 0,
    total: 0,
  }))

  const uidList: string[] = []
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

      if (!uidList.includes(dropInfo.uid))
        uidList.push(dropInfo.uid)

      hitQuest.total++
      dropInfo.reward.forEach((treasure) => {
        if (targetItem.celestialWeapon.includes(treasure.key))
          hitQuest.celestialWeapon++

        if (targetItem.revenantWeapon.includes(treasure.key))
          hitQuest.revenantWeapon++
      })
    }
    console.log(`完成${date}统计`)
  }
  console.log('记录玩家数量：', uidList.length)
  fsPromises.readFile('./gbf/drop/celestialWeapon/global.json', { encoding: 'utf8' }).then((data) => {
    const globalData: GlobalData = JSON.parse(data)
    const hit = globalData.data.find(event => event.value === lastEvent.value)
    if (hit)
      hit.quest = res
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
  total: number
  celestialWeapon: number
  revenantWeapon: number
}

interface Event {
  value: string
  title: string
  date: string[]
  quest: {
    questId: string
    questName: string
    questType: string
    questImage: string
  }[]
}
