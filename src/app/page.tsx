import { HeroSection } from '@/components/home/hero-section'
import { FeaturedCamps } from '@/components/home/featured-camps'
import { FindCampSection } from '@/components/home/find-camp-section'
import { WhyEmpowered } from '@/components/home/why-empowered'
import { Testimonials } from '@/components/home/testimonials'
import { CTABanner } from '@/components/home/cta-banner'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedCamps />
      <FindCampSection />
      <WhyEmpowered />
      <Testimonials />
      <CTABanner />
    </>
  )
}
