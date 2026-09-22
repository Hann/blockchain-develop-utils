import { describe, expect, it } from 'vitest'
import { getToolBySlug, toolHref, tools } from './tools'

describe('tools 카탈로그', () => {
  it('최소 하나의 도구는 ready 상태', () => {
    expect(tools.some((t) => t.status === 'ready')).toBe(true)
  })

  it('모든 slug는 unique', () => {
    const slugs = new Set(tools.map((t) => t.slug))
    expect(slugs.size).toBe(tools.length)
  })

  it('slug는 kebab-case 패턴', () => {
    for (const tool of tools) {
      expect(tool.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('key-generator는 ready 상태로 카탈로그에 존재', () => {
    const kg = getToolBySlug('key-generator')
    expect(kg).toBeDefined()
    expect(kg?.status).toBe('ready')
  })
})

describe('getToolBySlug', () => {
  it('존재하는 slug는 해당 Tool 반환', () => {
    const tool = getToolBySlug('key-generator')
    expect(tool?.name).toBe('Key Pair Generator')
  })

  it('존재하지 않는 slug는 undefined 반환', () => {
    expect(getToolBySlug('does-not-exist')).toBeUndefined()
    expect(getToolBySlug('')).toBeUndefined()
  })
})

describe('toolHref', () => {
  it('/tools/<slug> 형식의 URL 반환', () => {
    expect(toolHref('key-generator')).toBe('/tools/key-generator')
    expect(toolHref('abi-codec')).toBe('/tools/abi-codec')
  })
})
