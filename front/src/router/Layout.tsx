import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from '@/components'
import { init } from '@/setup'

function RootLayout() {
  useEffect(() => {
    void init()
  }, [])

  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </>
  )
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="spinner" role="status" aria-label="Loading"></div>
      }
    >
      {children}
    </Suspense>
  )
}

export { LazyPage, RootLayout }
