'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Share2,
  Mail,
  MessageCircle,
  Link2,
  Check,
  X,
  Copy,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Social media brand icons (inline SVGs for crisp rendering)
const FacebookIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

const XIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const LinkedInIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

const PinterestIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
  </svg>
)

const TumblrIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M14.563 24c-5.093 0-7.031-3.756-7.031-6.411V9.747H5.116V6.648c3.63-1.313 4.512-4.596 4.71-6.469C9.84.051 9.941 0 9.999 0h3.517v6.114h4.801v3.633h-4.82v7.47c.016 1.001.375 2.371 2.207 2.371h.09c.631-.02 1.486-.205 1.936-.419l1.156 3.425c-.436.636-2.4 1.374-4.156 1.404h-.178l.011.002z"/>
  </svg>
)

const InstagramIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.757-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
  </svg>
)

interface ShareCampButtonProps {
  campName: string
  campSlug: string
  campDescription?: string | null
  campDates: string
  campLocation?: string | null
}

export function ShareCampButton({
  campName,
  campSlug,
  campDescription,
  campDates,
  campLocation,
}: ShareCampButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [textCopied, setTextCopied] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get the full URL for sharing
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/camps/${campSlug}`
    : `/camps/${campSlug}`

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
      setIsMobile(mobile)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Share via email
  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Check out this camp: ${campName}`)
    const body = encodeURIComponent(
      `Hey!\n\nI thought you might be interested in this camp:\n\n` +
      `${campName}\n` +
      `${campDates}\n` +
      (campLocation ? `${campLocation}\n` : '') +
      (campDescription ? `\n${campDescription}\n` : '') +
      `\nRegister here: ${shareUrl}\n\n` +
      `See you there!`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
    setIsOpen(false)
  }

  // Share via SMS/text (mobile) or copy to clipboard (desktop)
  const handleTextShare = async () => {
    if (isMobile) {
      // On mobile, open SMS app
      const message = encodeURIComponent(
        `Check out this camp: ${campName} - ${campDates}. ` +
        `Register here: ${shareUrl}`
      )
      window.open(`sms:?body=${message}`, '_blank')
      setIsOpen(false)
    } else {
      // On desktop, copy link to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl)
        setTextCopied(true)
        setTimeout(() => {
          setTextCopied(false)
          setIsOpen(false)
        }, 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  // Social media share handlers
  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'width=600,height=400')
    setIsOpen(false)
  }

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`Check out ${campName} - ${campDates}!`)
    const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${text}`
    window.open(url, '_blank', 'width=600,height=400')
    setIsOpen(false)
  }

  const handleLinkedInShare = () => {
    const url = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(campName)}`
    window.open(url, '_blank', 'width=600,height=400')
    setIsOpen(false)
  }

  const handlePinterestShare = () => {
    const description = encodeURIComponent(`${campName} - ${campDates}`)
    const url = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${description}`
    window.open(url, '_blank', 'width=600,height=400')
    setIsOpen(false)
  }

  const handleTumblrShare = () => {
    const url = `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(campName)}`
    window.open(url, '_blank', 'width=600,height=400')
    setIsOpen(false)
  }

  // Instagram doesn't support direct web sharing - copy link with instruction
  const handleInstagramShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      alert('Link copied! Open Instagram and paste the link in your story or bio.')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 w-full py-3 text-white/50 hover:text-white border border-white/10 hover:border-white/30 transition-all"
      >
        <Share2 className="h-4 w-4" />
        <span className="text-sm uppercase tracking-wider">Share Camp</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-dark-100 border border-white/20 shadow-xl z-50">
          <div className="py-2">
            {/* Email Share */}
            <button
              onClick={handleEmailShare}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
              <Mail className="h-5 w-5 text-neon" />
              <div>
                <div className="text-white font-medium">Share via Email</div>
                <div className="text-xs text-white/40">Opens your email app</div>
              </div>
            </button>

            {/* Text Share - different behavior on mobile vs desktop */}
            <button
              onClick={handleTextShare}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
              {textCopied ? (
                <>
                  <Check className="h-5 w-5 text-neon" />
                  <div>
                    <div className="text-neon font-medium">Link Copied!</div>
                    <div className="text-xs text-white/40">Paste in your text message</div>
                  </div>
                </>
              ) : (
                <>
                  <MessageCircle className="h-5 w-5 text-purple" />
                  <div>
                    <div className="text-white font-medium">Share via Text</div>
                    <div className="text-xs text-white/40">
                      {isMobile ? 'Opens your messaging app' : 'Copy link to paste in text'}
                    </div>
                  </div>
                </>
              )}
            </button>

            <div className="border-t border-white/10 my-2" />

            {/* Social Media Section */}
            <div className="px-4 py-2">
              <div className="text-xs text-white/40 uppercase tracking-wider mb-2">
                Share on Social Media
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleFacebookShare}
                  className="flex flex-col items-center gap-1 p-3 hover:bg-white/5 transition-colors group"
                  title="Share on Facebook"
                >
                  <div className="text-[#1877F2] group-hover:scale-110 transition-transform">
                    <FacebookIcon />
                  </div>
                  <span className="text-xs text-white/50">Facebook</span>
                </button>

                <button
                  onClick={handleTwitterShare}
                  className="flex flex-col items-center gap-1 p-3 hover:bg-white/5 transition-colors group"
                  title="Share on X"
                >
                  <div className="text-white group-hover:scale-110 transition-transform">
                    <XIcon />
                  </div>
                  <span className="text-xs text-white/50">X</span>
                </button>

                <button
                  onClick={handleInstagramShare}
                  className="flex flex-col items-center gap-1 p-3 hover:bg-white/5 transition-colors group"
                  title="Share on Instagram"
                >
                  <div className="text-[#E4405F] group-hover:scale-110 transition-transform">
                    <InstagramIcon />
                  </div>
                  <span className="text-xs text-white/50">Instagram</span>
                </button>

                <button
                  onClick={handleLinkedInShare}
                  className="flex flex-col items-center gap-1 p-3 hover:bg-white/5 transition-colors group"
                  title="Share on LinkedIn"
                >
                  <div className="text-[#0A66C2] group-hover:scale-110 transition-transform">
                    <LinkedInIcon />
                  </div>
                  <span className="text-xs text-white/50">LinkedIn</span>
                </button>

                <button
                  onClick={handlePinterestShare}
                  className="flex flex-col items-center gap-1 p-3 hover:bg-white/5 transition-colors group"
                  title="Share on Pinterest"
                >
                  <div className="text-[#BD081C] group-hover:scale-110 transition-transform">
                    <PinterestIcon />
                  </div>
                  <span className="text-xs text-white/50">Pinterest</span>
                </button>

                <button
                  onClick={handleTumblrShare}
                  className="flex flex-col items-center gap-1 p-3 hover:bg-white/5 transition-colors group"
                  title="Share on Tumblr"
                >
                  <div className="text-[#36465D] group-hover:scale-110 transition-transform">
                    <TumblrIcon />
                  </div>
                  <span className="text-xs text-white/50">Tumblr</span>
                </button>
              </div>
            </div>

            <div className="border-t border-white/10 my-2" />

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-5 w-5 text-neon" />
                  <div>
                    <div className="text-neon font-medium">Link Copied!</div>
                    <div className="text-xs text-white/40">Paste anywhere to share</div>
                  </div>
                </>
              ) : (
                <>
                  <Link2 className="h-5 w-5 text-white/60" />
                  <div>
                    <div className="text-white font-medium">Copy Link</div>
                    <div className="text-xs text-white/40">Copy camp URL to clipboard</div>
                  </div>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
