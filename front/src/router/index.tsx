import { createHashRouter, Navigate } from 'react-router-dom'
import { LazyPage, RootLayout } from './Layout'

import { ErrorPage, Home, Changelog } from '@/views/pages'

export const router = createHashRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: ':tab?',
        element: (
          <LazyPage>
            <Home />
          </LazyPage>
        )
      },
      {
        path: 'changelog',
        element: (
          <LazyPage>
            <Changelog />
          </LazyPage>
        )
      },
      {
        path: '*',
        element: <Navigate to="/" replace />
      }
    ]
  }
])
