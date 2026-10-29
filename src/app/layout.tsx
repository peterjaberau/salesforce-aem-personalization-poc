import { Provider } from "./provider"
import { SalesforcePersonalization } from "./salesforce-personalization"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning style={{ overflow: "hidden" }}>
      <body>
        <Provider>
          <SalesforcePersonalization />
          {children}
        </Provider>
      </body>
    </html>
  )
}
