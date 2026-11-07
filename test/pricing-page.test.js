const { test } = require('node:test')
const assert = require('node:assert/strict')
const createPaywall = require('..')

// 訪客 / 免費 / Pro:訪客要定義(功能閘門用得到),但不出現在方案頁
const paywall = createPaywall({
  tiers: [
    { id: 'guest', name: '訪客', price: 0, listed: false, features: { results: 3, subtitles: true, download: false } },
    { id: 'free', name: '免費', price: 0, features: { results: 5, subtitles: true, download: false } },
    { id: 'pro', name: 'Pro', price: 399, features: { results: -1, subtitles: true, download: true } }
  ]
})

test('pricingTiers 不含 listed:false 的等級;allTiers 照舊全部', () => {
  assert.deepEqual(paywall.pricingTiers().map((t) => t.id), ['free', 'pro'])
  assert.deepEqual(paywall.allTiers().map((t) => t.id), ['guest', 'free', 'pro'])
})

test('compare 預設不比訪客;onlyDifferent 只留各欄不一樣的列', () => {
  const all = paywall.compare()
  assert.deepEqual(all.tiers.map((t) => t.id), ['free', 'pro'])
  assert.deepEqual(all.rows.map((r) => r.feature), ['results', 'subtitles', 'download'])
  const diff = paywall.compare(null, { onlyDifferent: true })
  assert.deepEqual(diff.rows, [
    { feature: 'results', values: { free: 5, pro: -1 } },
    { feature: 'download', values: { free: false, pro: true } }
  ])
  assert.deepEqual(paywall.compare(['results'], { includeUnlisted: true }).tiers.map((t) => t.id), ['guest', 'free', 'pro'])
})

test('功能閘門照樣用得到不列出的等級', () => {
  assert.equal(paywall.checkQuota('guest', 'results', 3).atLimit, true)
  assert.equal(paywall.can('guest', 'download'), false)
})
