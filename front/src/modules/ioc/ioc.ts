import {
  ChangelogRepository,
  ChangelogService,
  HomeRepository,
  HomeService
} from '@/modules/services'
import {
  type IChangelogRepository,
  type IHomeRepository,
  REPOSITORIES,
  SERVICES
} from '@/types'

class IoC {
  private instances: Record<string, unknown> = {}

  public getOrCreateInstance<T>(name: string): T {
    const instance = this.instances[name]

    if (instance) return instance as T

    let newInstance: unknown

    switch (name) {
      case SERVICES.CHANGELOG:
        newInstance = new ChangelogService(
          this.getOrCreateInstance<IChangelogRepository>(REPOSITORIES.CHANGELOG)
        )
        break
      case SERVICES.HOME:
        newInstance = new HomeService(
          this.getOrCreateInstance<IHomeRepository>(REPOSITORIES.HOME)
        )
        break

      case REPOSITORIES.CHANGELOG:
        newInstance = new ChangelogRepository()
        break
      case REPOSITORIES.HOME:
        newInstance = new HomeRepository()
        break
      default:
        break
    }

    this.instances[name] = newInstance

    return newInstance as T
  }

  public cleanUp(name: string): void {
    delete this.instances[name]
  }
}

export default new IoC()
