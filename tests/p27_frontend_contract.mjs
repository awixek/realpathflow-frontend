import fs from 'node:fs'

const dashboard = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8')
const edit = fs.readFileSync('src/pages/RoadmapEditPage.tsx', 'utf8')
const roadmapApi = fs.readFileSync('src/lib/roadmapApi.ts', 'utf8')
const dashboardApi = fs.readFileSync('src/lib/dashboardApi.ts', 'utf8')

function assertContains(text, needle, label) {
  if (!text.includes(needle)) throw new Error(`${label}: missing ${needle}`)
}

assertContains(dashboard, 'adaptive', 'Dashboard adaptive data')
assertContains(dashboard, 'Rebalance with AI', 'Dashboard adaptive CTA')
assertContains(dashboard, 'Keep deadline', 'Dashboard strategy option')
assertContains(dashboard, 'Reduce scope', 'Dashboard strategy option')
assertContains(dashboard, 'Increase daily time', 'Dashboard strategy option')
assertContains(dashboard, 'Extend deadline', 'Dashboard strategy option')
assertContains(edit, 'previewAdaptiveReplan', 'Adaptive preview UI')
assertContains(edit, 'Apply Changes', 'Approval/apply UI')
assertContains(roadmapApi, '/adaptive/preview', 'Adaptive preview endpoint')
assertContains(roadmapApi, 'approval_token', 'Approval token contract')
assertContains(dashboardApi, 'AdaptiveAnalysis', 'Adaptive dashboard type')
assertContains(dashboardApi, 'data.adaptive', 'Adaptive dashboard mapping')

console.log('P27 frontend contract: PASS')
