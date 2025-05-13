import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import Script from "next/script"

export const metadata: Metadata = {
  title: "MemoCat - Elegant Local Note-Taking App",
  description: "A clean, elegant local note-taking app with support for tags and nested tags",
  icons: {
    icon: "/favicon.ico",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        {children}
        <Script
          defer
          data-domain="memocat.com"
          src="https://click.pageview.click/js/script.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
