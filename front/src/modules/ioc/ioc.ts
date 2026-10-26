import {
  ChangelogRepository,
  ChangelogService
} from '@/modules/services/changelog'
import DashboardRepository from '@/modules/services/dashboard/dashboard.repository'
import DashboardService from '@/modules/services/dashboard/dashboard.service'
import RealtimeRepository from '@/modules/services/realtime/realtime.repository'
import RealtimeService from '@/modules/services/realtime/realtime.service'
import {
  type IChangelogRepository,
  type IDashboardRepository,
  type IRealtimeRepository,
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
      case SERVICES.DASHBOARD:
        newInstance = new DashboardService(
          this.getOrCreateInstance<IDashboardRepository>(REPOSITORIES.DASHBOARD)
        )
        break
      case SERVICES.REALTIME:
        newInstance = new RealtimeService(
          this.getOrCreateInstance<IRealtimeRepository>(REPOSITORIES.REALTIME)
        )
        break
      case REPOSITORIES.CHANGELOG:
        newInstance = new ChangelogRepository()
        break
      case REPOSITORIES.DASHBOARD:
        newInstance = new DashboardRepository()
        break
      case REPOSITORIES.REALTIME:
        newInstance = new RealtimeRepository()
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
