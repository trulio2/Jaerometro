import type { IHomeRepository } from '@/types'

export default class HomeRepository implements IHomeRepository {
  public getTest(): string {
    return 'Test'
  }
}
