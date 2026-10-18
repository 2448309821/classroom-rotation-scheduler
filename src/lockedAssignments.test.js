import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getArchivedAssignments,
  mergeAssignmentOverrides,
} from './lockedAssignments.js'

test('restores class assignments from a legacy archived markdown table', () => {
  const archived = {
    markdown: `# 2026年8月 担当表

|  | 8/22 | 8/29 |
| --- | --- | --- |
| 特別連絡 |  |  |
| 講師F | きく | さくら |
| 講師A | わかば | きく |
| 講師B | 入門 | わかば |
| 講師C | ○ | ○ |
| 講師D | × | 入門 |`,
  }

  assert.deepEqual(getArchivedAssignments(archived, ['きく', 'さくら', 'わかば', '入門']), {
    '8/22': { 'きく': '講師F', 'わかば': '講師A', '入門': '講師B' },
    '8/29': { 'さくら': '講師F', 'きく': '講師A', 'わかば': '講師B', '入門': '講師D' },
  })
})

test('a later manual exchange overrides the archived assignment', () => {
  const archived = {
    assignmentsBySession: {
      '8/29': { 'きく': '講師A', 'さくら': '講師F', 'わかば': '講師B', '入門': '講師D' },
    },
  }

  assert.deepEqual(
    mergeAssignmentOverrides(getArchivedAssignments(archived, ['きく', 'さくら', 'わかば', '入門']), {
      '8/29': { 'きく': '講師F', 'さくら': '講師A' },
    }),
    {
      '8/29': { 'きく': '講師F', 'さくら': '講師A', 'わかば': '講師B', '入門': '講師D' },
    },
  )
})
