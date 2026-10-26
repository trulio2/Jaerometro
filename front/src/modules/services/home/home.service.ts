import type { IHomeRepository, IHomeService } from '@/types'

export default class HomeService implements IHomeService {
  constructor(private homeRepository: IHomeRepository) {}

  public getTest(): string {
    return this.homeRepository.getTest()
  }
}
