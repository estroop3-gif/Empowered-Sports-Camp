import type { Metadata } from "next";
import FindACampClient from "./FindACampClient";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Girls Sports Camps Near You | Empowered Sports Camps",
    description:
      "Find girls sports camps near you. Safe, confidence-building programs led by women coaches. Soccer, basketball & multi-sport. 5,000+ athletes trained. Register today.",
    alternates: {
      canonical: "https://www.empoweredsportscamps.com/find-a-camp",
    },
    openGraph: {
      title: "Find Girls Sports Camps Near You | Empowered Sports Camps",
      description:
        "Discover top-rated girls sports camps in your area. Expert women coaches, proven results, limited summer spots. Find and register today.",
      url: "https://www.empoweredsportscamps.com/find-a-camp",
      type: "website",
    },
  };
}

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Empowered Sports Camps",
  url: "https://www.empoweredsportscamps.com",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "487",
    bestRating: "5",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What age groups do your girls sports camps serve?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Empowered Sports Camps offers programs for girls ages 7-16 across soccer, basketball, and multi-sport disciplines.",
      },
    },
    {
      "@type": "Question",
      name: "Are your sports camps safe for girls?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Every Empowered Sports Camp is a supervised, judgment-free environment staffed by background-checked women coaches with collegiate and professional experience.",
      },
    },
    {
      "@type": "Question",
      name: "How do I find a girls sports camp near me?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Enter your zip code in the search tool on this page to instantly find available Empowered Sports Camps in your area.",
      },
    },
    {
      "@type": "Question",
      name: "How much do girls sports camps cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Camp pricing varies by program, location, and duration. Use the zip code finder to view camps near you and see current pricing and availability.",
      },
    },
    {
      "@type": "Question",
      name: "When does summer camp registration open?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Summer 2026 registration is now open. Spots are limited -- use the finder to secure your daughter's spot before camps fill.",
      },
    },
  ],
};

export default function FindACampPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
      <FindACampClient />
    </>
  );
}
