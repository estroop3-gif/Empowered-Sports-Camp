import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { MainContentWrapper } from "@/components/layout/MainContentWrapper"
import { AuthProvider } from "@/lib/auth/context"
import { ViewingAsBanner } from "@/components/admin/view-as-control"
import { GlobalDeveloperModeBanner } from "@/components/admin/DeveloperModeBanner"
import { RoleDashboardRouter } from "@/components/role-dashboard-router"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
})

export const metadata: Metadata = {
  title: {
    default: "Empowered Sports Camp | Building Confidence Through Sports",
    template: "%s | Empowered Sports Camp",
  },
  description:
    "Empowering girls through sports, leadership, and confidence. Join thousands of athletes who have discovered their strength at Empowered Sports Camp.",
  keywords: [
    "girls sports camp",
    "youth sports",
    "summer camp",
    "girls empowerment",
    "Chicago sports camp",
    "soccer camp",
    "basketball camp",
    "volleyball camp",
  ],
  authors: [{ name: "Empowered Sports Camp" }],
  icons: {
    icon: "/images/logo.png",
    apple: "/images/logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Empowered Sports Camp",
    title: "Empowered Sports Camp | Building Confidence Through Sports",
    description:
      "Empowering girls through sports, leadership, and confidence.",
    images: ["/images/logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Empowered Sports Camp",
    description:
      "Empowering girls through sports, leadership, and confidence.",
    images: ["/images/logo.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="min-h-screen bg-black text-white font-sans antialiased">
        <AuthProvider>
          <GlobalDeveloperModeBanner />
          <ViewingAsBanner />
          <RoleDashboardRouter>
            <Navbar />
            <MainContentWrapper>
              <main className="flex flex-col min-h-screen">
                {children}
              </main>
            </MainContentWrapper>
            <Footer />
          </RoleDashboardRouter>
        </AuthProvider>
        {/* Portal container for modals - must be outside all other content */}
        <div id="modal-root" />
      </body>
    </html>
  )
}
