import dotenv from 'dotenv'
import dayjs from 'dayjs'
import goldBrickAnalytics from './goldBrick'
import eternitySandAnalytics from './eternitySand';

(async () => {
  const env = dotenv.config().parsed

  if (!env)
    return

  const questResp = await fetch(`${env.BASE_ADMIN_API}/ext/quest`, { method: 'get' })
  const { data: Quest }: { data: Quest[] } = await questResp.json()

  const startDate = '2022-03-09'
  const endDate = dayjs().format('YYYY-MM-DD')
  const diffDays = dayjs(endDate).diff(startDate, 'day')
  const updateTime = dayjs().format('YYYY-MM-DD HH:mm:ss')

  const ffjTargetQuest = Quest.filter(q => goldBrickAnalytics.TARGET_ITEM_KEY.includes(q.targetItemKey))
  const sandTargetQuest = Quest.filter(q => eternitySandAnalytics.TARGET_ITEM_KEY.includes(q.targetItemKey))
  const totalTargetQuest = ffjTargetQuest.concat(sandTargetQuest)

  const ffj = goldBrickAnalytics.main(ffjTargetQuest, updateTime)
  const sand = eternitySandAnalytics.main(sandTargetQuest, updateTime)

  const uidList: string[] = []

  if (!ffj || !sand)
    return

  for (let index = 0; index < diffDays + 1; index++) {
    const date = dayjs(startDate).add(index, 'day').format('YYYY-MM-DD')
    const body = JSON.stringify({ questId: totalTargetQuest.map(q => q.questId), dateRange: [date, date] })

    const resp = await fetch(`${env.BASE_RESOURCE_API}/gbf/reward/battle/search`, {
      headers: { 'Content-Type': 'application/json' },
      method: 'post',
      body,
    })

    const { list }: { list: DropInfo[] } = await resp.json()

    for (let i = list.length - 1; i >= 0; i--) {
      const dropInfo = list[i]
      if (!uidList.includes(dropInfo.uid))
        uidList.push(dropInfo.uid)
    }

    ffj(date, list.filter(i => ffjTargetQuest.some(q => q.questId === i.questId)), index === diffDays)
    sand(date, list.filter(i => sandTargetQuest.some(q => q.questId === i.questId)), index === diffDays)

    console.log(`完成${date}统计`)
  }
  console.log('记录玩家数量：', uidList.length)
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

interface Quest {
  questId: string
  questName: string
  isBlueBox: boolean
  isBlueTreasure: boolean
  targetItemKey: string
}
