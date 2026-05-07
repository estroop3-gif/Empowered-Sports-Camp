"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./FindACamp.module.css";

export default function FindACampClient() {
  const router = useRouter();
  const [heroZip, setHeroZip] = useState("");
  const [finderZip, setFinderZip] = useState("");
  const [ctaZip, setCtaZip] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [registrationCount, setRegistrationCount] = useState<number | null>(null);

  const handleSearch = useCallback(
    (zip: string) => {
      const trimmed = zip.trim();
      if (trimmed) {
        router.push(`/camps?zip=${encodeURIComponent(trimmed)}`);
      } else {
        router.push("/camps");
      }
    },
    [router]
  );

  // Fetch live registration count
  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/public/registration-count");
        const data = await res.json();
        if (typeof data.count === "number") {
          setRegistrationCount(data.count);
        }
      } catch {
        // Silently fail — counter just won't show
      }
    }
    fetchCount();
    // Refresh every 60 seconds
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, []);

  const faqs = [
    {
      q: "What age groups do your girls sports camps serve?",
      a: "Empowered Sports Camps runs programs for girls ages 7-16 across soccer, basketball, and multi-sport. Use the zip code finder to see which programs are available near you.",
    },
    {
      q: "Are your camps safe for girls?",
      a: "Yes. Every camp is supervised by background-checked women coaches in a structured, judgment-free environment. Safety and inclusion are non-negotiable at every Empowered location.",
    },
    {
      q: "How do I find a girls sports camp near me?",
      a: "Enter your zip code in the search tool above. You'll instantly see available Empowered Sports Camps in your area with dates, pricing, and registration links.",
    },
    {
      q: "How much do girls sports camps cost?",
      a: "Pricing varies by program, location, and duration. Search by zip code to view current pricing for camps near you.",
    },
    {
      q: "When does summer 2026 registration open?",
      a: "Summer 2026 registration is open now. Spots are limited at every location -- search your zip code to secure your daughter's spot before camps fill.",
    },
  ];

  const camps = [
    {
      tag: "Soccer",
      ages: "Ages 8-14",
      title: "GIRLS SUMMER SOCCER CAMP",
      body: "Ball control, positioning, finishing, and team tactics -- taught in an all-girls environment designed to build skill and confidence simultaneously.",
    },
    {
      tag: "Basketball",
      ages: "Ages 10-16",
      title: "GIRLS BASKETBALL TRAINING CAMP",
      body: "D1-coached skills training, game IQ, and leadership drills. One of the most competitive girls basketball camp programs in the country.",
    },
    {
      tag: "Multi-Sport",
      ages: "Ages 7-13",
      title: "GIRLS MULTI-SPORT SUMMER CAMP",
      body: "The perfect introduction to competitive athletics. A full week of soccer, basketball, volleyball, and track in one all-girls program.",
    },
  ];

  const testimonials = [
    {
      program: "Summer Soccer Camp",
      quote:
        "I was nervous sending my shy 10-year-old. By day three she was leading warm-ups. The coaches know exactly how to bring girls out of their shell.",
      author: "Jessica T., Denver CO",
    },
    {
      program: "Girls Basketball Camp",
      quote:
        "Her skills improved more in one week at Empowered than in an entire rec league season. We found this camp searching 'girls basketball camp near me' and it was the best decision we made.",
      author: "Maria L., Phoenix AZ",
    },
    {
      program: "Multi-Sport Camp",
      quote:
        "Safe, well-organized, and genuinely transformative. My daughter came home standing taller. We're already registered for next summer.",
      author: "Keisha R., Atlanta GA",
    },
  ];

  const whyItems = [
    {
      num: "01",
      title: "SAFE, SUPERVISED PROGRAMS",
      body: "Every camp is staffed by background-checked women coaches in a structured, judgment-free environment for girls of all skill levels.",
    },
    {
      num: "02",
      title: "CONFIDENCE & MINDSET COACHING",
      body: "Our coaches build athletic skill and mental resilience. Girls leave tougher, more confident, and ready to lead.",
    },
    {
      num: "03",
      title: "EXPERT WOMEN COACHES",
      body: "Led by coaches with collegiate and professional playing experience. Real athletes teaching your daughter the right way.",
    },
    {
      num: "04",
      title: "LEADERSHIP DEVELOPMENT",
      body: "Camp isn't just sport -- it's a formative experience. Girls develop communication, teamwork, and leadership skills that last.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* NAV */}
      <nav className="border-b border-[#222222] bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <span className="text-lg font-bold tracking-tight">
            EMPOWERED{" "}
            <span className="text-[#c3f73a]">SPORTS CAMPS</span>
          </span>
        </div>
      </nav>

      {/* SECTION 1 -- HERO */}
      <section aria-label="Hero" className="bg-[#0a0a0a] pt-20 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 border border-[#222222] rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#c3f73a]" />
            <span className="text-xs font-semibold tracking-widest text-[#888888] uppercase">
              Summer 2026 Registration Now Open
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black uppercase tracking-tight leading-[0.9]">
            GIRLS SPORTS CAMPS
            <br />
            <span className={`text-[#c3f73a] ${styles.glowGreen}`}>
              NEAR YOU
            </span>
          </h1>

          <p className="mt-8 text-lg text-[#888888] max-w-2xl mx-auto">
            Find safe, confidence-building girls sports camps in your area -- led by expert women coaches with real playing experience.
          </p>
          <p className="mt-4 text-base text-[#888888] max-w-2xl mx-auto">
            Soccer, basketball, and multi-sport programs for girls ages 7-16. Over 5,000 athletes trained. Search by zip code to see what&apos;s available near you.
          </p>

          <form
            aria-label="Hero camp search"
            className="mt-10 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(heroZip);
            }}
          >
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              placeholder="Enter zip code"
              value={heroZip}
              onChange={(e) => setHeroZip(e.target.value)}
              className="flex-1 bg-[#161616] border border-[#222222] rounded-lg px-4 py-3.5 text-white placeholder-[#888888] focus:outline-none focus:border-[#c3f73a] transition-colors"
              aria-label="Zip code"
            />
            <button
              type="submit"
              className="bg-[#c3f73a] text-black font-bold text-sm tracking-wider px-6 py-3.5 rounded-lg hover:brightness-110 transition-all cursor-pointer whitespace-nowrap"
            >
              FIND GIRLS SPORTS CAMPS
            </button>
          </form>
        </div>
      </section>

      {/* SECTION 2 -- TRUST BAR */}
      <section aria-label="Trust statistics" className="bg-[#111111] border-y border-[#222222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-0">
            <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 lg:flex-1">
              <div>
                <p className="text-4xl font-black text-white">5,000+</p>
                <p className="text-sm text-[#888888] mt-1">Girls Trained</p>
              </div>
              <div>
                <p className="text-4xl font-black text-white">98%</p>
                <p className="text-sm text-[#888888] mt-1">Return Rate</p>
              </div>
              <div>
                <p className="text-4xl font-black text-white">4.9</p>
                <p className="text-sm text-[#888888] mt-1">Parent Rating</p>
              </div>
            </div>

            <div className="lg:flex-1 lg:border-l lg:border-[#c3f73a] lg:pl-10">
              <blockquote className="border-l-2 border-[#c3f73a] pl-5 lg:border-l-0 lg:pl-0">
                <p className="text-[#888888] italic leading-relaxed">
                  &quot;We searched for girls sports camps near us and found Empowered. My daughter came home more confident than I&apos;ve ever seen her -- she made the school team that fall.&quot;
                </p>
                <footer className="mt-3 text-sm text-[#888888]">
                  -- Sarah M., Parent, Austin TX
                </footer>
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 -- CAMP FINDER */}
      <section aria-label="Camp finder" className="bg-[#0a0a0a] py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#c3f73a] uppercase mb-4">
            Camp Finder
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-[0.95]">
            FIND GIRLS SPORTS CAMPS
            <br />
            <span className="text-[#c3f73a]">NEAR YOU</span>
          </h2>
          <p className="mt-6 text-[#888888] max-w-xl mx-auto">
            Enter your zip code to instantly see available girls sports camps in your area -- with dates, pricing, and registration.
          </p>

          <div className="mt-10 bg-[#161616] border border-[#222222] rounded-xl p-8">
            <form
              aria-label="Camp finder search"
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(finderZip);
              }}
            >
              <label className="block text-left text-xs font-semibold tracking-widest text-[#888888] uppercase mb-2">
                Your Zip Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                placeholder="e.g. 78701"
                value={finderZip}
                onChange={(e) => setFinderZip(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#222222] rounded-lg px-4 py-3.5 text-white placeholder-[#888888] focus:outline-none focus:border-[#c3f73a] transition-colors"
                aria-label="Zip code"
              />
              <button
                type="submit"
                className="w-full mt-4 bg-[#c3f73a] text-black font-bold text-sm tracking-wider px-6 py-3.5 rounded-lg hover:brightness-110 transition-all cursor-pointer"
              >
                SEARCH GIRLS SPORTS CAMPS
              </button>
            </form>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-[#222222]" />
              <span className="text-xs text-[#888888]">or</span>
              <div className="flex-1 h-px bg-[#222222]" />
            </div>

            <button
              type="button"
              onClick={() => router.push("/camps")}
              className="w-full border border-[#222222] text-white font-bold text-sm tracking-wider px-6 py-3.5 rounded-lg hover:border-[#c3f73a] transition-colors cursor-pointer"
            >
              BROWSE ALL CAMP LOCATIONS
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 4 -- WHY CHOOSE US */}
      <section aria-label="Why choose Empowered" className="bg-[#111111] py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#c3f73a] uppercase mb-4">
              Why Empowered
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-[0.95]">
              WHAT MAKES OUR GIRLS
              <br />
              SPORTS CAMPS DIFFERENT
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#222222] border border-[#222222] rounded-xl overflow-hidden">
            {whyItems.map((item) => (
              <div key={item.num} className="bg-[#161616] p-8">
                <p className="text-3xl font-black text-[#c3f73a] mb-4">{item.num}</p>
                <h3 className="text-sm font-bold tracking-wider uppercase mb-3">{item.title}</h3>
                <p className="text-sm text-[#888888] leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 -- CAMP PREVIEW */}
      <section aria-label="Featured camp programs" className="bg-[#0a0a0a] py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#c3f73a] uppercase mb-4">
              Featured Programs
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-[0.95]">
              POPULAR GIRLS SPORTS CAMPS
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[#222222] border border-[#222222] rounded-xl overflow-hidden">
            {camps.map((camp) => (
              <div key={camp.title} className="bg-[#161616] p-8 flex flex-col">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-xs font-semibold tracking-wider text-[#c3f73a] uppercase">
                    {camp.tag}
                  </span>
                  <span className="text-xs text-[#888888]">{camp.ages}</span>
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-3">{camp.title}</h3>
                <p className="text-sm text-[#888888] leading-relaxed flex-1">{camp.body}</p>
                <button
                  type="button"
                  className="mt-6 w-full border border-[#222222] text-white font-bold text-sm tracking-wider px-6 py-3 rounded-lg hover:border-[#c3f73a] transition-colors cursor-pointer"
                >
                  VIEW CAMP DETAILS
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 -- TESTIMONIALS */}
      <section aria-label="Parent testimonials" className="bg-[#111111] py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#c3f73a] uppercase mb-4">
              Parent Reviews
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-[0.95]">
              WHAT PARENTS SAY ABOUT
              <br />
              OUR GIRLS SPORTS CAMPS
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[#222222] border border-[#222222] rounded-xl overflow-hidden">
            {testimonials.map((t) => (
              <div key={t.author} className="bg-[#161616] p-8 flex flex-col">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-[#c3f73a] text-sm">
                      &#9733;
                    </span>
                  ))}
                </div>
                <p className="text-xs font-semibold tracking-wider text-[#c3f73a] uppercase mb-4">
                  {t.program}
                </p>
                <p className="text-sm text-[#888888] leading-relaxed italic flex-1">
                  &quot;{t.quote}&quot;
                </p>
                <p className="mt-5 text-sm font-semibold text-white">{t.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7 -- FAQ */}
      <section aria-label="Frequently asked questions" className="bg-[#0a0a0a] py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#c3f73a] uppercase mb-4">
              FAQ
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-[0.95]">
              COMMON QUESTIONS ABOUT
              <br />
              GIRLS SPORTS CAMPS
            </h2>
          </div>

          <div className="border border-[#222222] rounded-xl overflow-hidden divide-y divide-[#222222]">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-[#161616]">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span className="text-sm font-semibold pr-4">{faq.q}</span>
                  <span className="text-[#c3f73a] text-xl flex-shrink-0">
                    {openFaq === i ? "-" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-[#888888] leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8 -- FINAL CTA */}
      <section aria-label="Register now" className="bg-[#0a0a0a] py-20 px-4 sm:px-6 lg:px-8 border-t border-[#222222]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 border border-[#222222] rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#c3f73a]" />
            <span className="text-xs font-semibold tracking-widest text-[#888888] uppercase">
              Limited Summer 2026 Spots Remaining
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-7xl font-black uppercase tracking-tight leading-[0.9]">
            GIRLS SPORTS CAMPS
            <br />
            <span className={`text-[#c3f73a] ${styles.glowGreen}`}>
              NEAR YOU -- REGISTER NOW.
            </span>
          </h2>

          {registrationCount !== null && registrationCount > 0 && (
            <p className="mt-6 text-sm font-semibold tracking-wider text-[#c3f73a]">
              {registrationCount.toLocaleString()} ATHLETES REGISTERED SITE-WIDE
            </p>
          )}

          <p className="mt-8 text-lg text-[#888888] max-w-2xl mx-auto">
            Summer spots fill fast. Find girls sports camps near you and secure your daughter&apos;s place today.
          </p>
          <p className="mt-3 text-sm text-[#888888]">
            Soccer, Basketball, Multi-Sport, Ages 7-16
          </p>

          <form
            aria-label="Final call to action camp search"
            className="mt-10 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(ctaZip);
            }}
          >
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              placeholder="Enter zip code"
              value={ctaZip}
              onChange={(e) => setCtaZip(e.target.value)}
              className="flex-1 bg-[#161616] border border-[#222222] rounded-lg px-4 py-3.5 text-white placeholder-[#888888] focus:outline-none focus:border-[#c3f73a] transition-colors"
              aria-label="Zip code"
            />
            <button
              type="submit"
              className="bg-[#c3f73a] text-black font-bold text-sm tracking-wider px-6 py-3.5 rounded-lg hover:brightness-110 transition-all cursor-pointer whitespace-nowrap"
            >
              FIND GIRLS SPORTS CAMPS
            </button>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#222222] bg-[#0a0a0a] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs text-[#888888]">
            2026 Empowered Sports Camps. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
