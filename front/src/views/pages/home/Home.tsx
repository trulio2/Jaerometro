import IoC from '@/modules/ioc'
import { SERVICES, type IHomeService } from '@/types'

function Home() {
  const homeService = IoC.getOrCreateInstance<IHomeService>(SERVICES.HOME)

  const test = homeService.getTest()

  return (
    <div>
      <p>{test}</p>
    </div>
  )
}

export default Home
