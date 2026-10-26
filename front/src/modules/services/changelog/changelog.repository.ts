import type { ChangelogEntry, IChangelogRepository } from '@/types'

export default class ChangelogRepository implements IChangelogRepository {
  public getEntries(): ChangelogEntry[] {
    return [
      {
        version: '0.0.1',
        date: '2026-10-26',
        items: []
      }
    ]
  }
}
