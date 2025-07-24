import { ApplicationLayout } from './application-layout'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <ApplicationLayout>{children}</ApplicationLayout>
}
