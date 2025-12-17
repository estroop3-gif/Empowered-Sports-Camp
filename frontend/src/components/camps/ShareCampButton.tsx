'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Share2,
  Mail,
  MessageCircle,
  Users,
  Link2,
  Check,
  X,
  Search,
  Loader2,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/context'

interface ShareCampButtonProps {
  campName: string
  campSlug: string
  campDescription?: string | null
  campDates: string
  campLocation?: string | null
}

interface ProfileSearchResult {
  id: string
  firstName: string
  lastName: string
  email: string
}

export function ShareCampButton({
  campName,
  campSlug,
  campDescription,
  campDates,
  campLocation,
}: ShareCampButtonProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<ProfileSearchResult | null>(null)
  const [shareMessage, setShareMessage] = useState('')
  const [shareSuccess, setShareSuccess] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get the full URL for sharing
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/camps/${campSlug}`
    : `/camps/${campSlug}`

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

  // Load all profiles when modal opens
  useEffect(() => {
    if (!showProfileModal) {
      setSearchResults([])
      return
    }

    const loadProfiles = async () => {
      setSearching(true)
      try {
        const res = await fetch('/api/profiles/search?q=')
        const data = await res.json()
        if (data.data) {
          setSearchResults(data.data.filter((p: ProfileSearchResult) => p.id !== user?.id))
        }
      } catch (err) {
        console.error('Failed to load profiles:', err)
      } finally {
        setSearching(false)
      }
    }

    loadProfiles()
  }, [showProfileModal, user?.id])

  // Search/filter profiles when query changes
  useEffect(() => {
    if (!showProfileModal || searchQuery.length < 2) return

    const searchProfiles = async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        if (data.data) {
          setSearchResults(data.data.filter((p: ProfileSearchResult) => p.id !== user?.id))
        }
      } catch (err) {
        console.error('Failed to search profiles:', err)
      } finally {
        setSearching(false)
      }
    }

    const debounce = setTimeout(searchProfiles, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, showProfileModal, user?.id])

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

  // Share via SMS/text
  const handleTextShare = () => {
    const message = encodeURIComponent(
      `Check out this camp: ${campName} - ${campDates}. ` +
      `Register here: ${shareUrl}`
    )
    // Use sms: protocol - works on mobile devices
    window.open(`sms:?body=${message}`, '_blank')
    setIsOpen(false)
  }

  // Open profile share modal
  const handleProfileShare = () => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      return
    }
    setShowProfileModal(true)
    setIsOpen(false)
    setShareMessage(`Hey! I thought you might be interested in ${campName}. Check it out!`)
  }

  // Send share to selected profile
  const handleSendShare = async () => {
    if (!selectedProfile) return

    // Check if user is logged in
    if (!user) {
      setShareError('Please log in to share camps with other users')
      return
    }

    setSending(true)
    setShareError(null)

    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: selectedProfile.id,
          campSlug,
          campName,
          message: shareMessage,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Please log in to share camps with other users')
        }
        throw new Error(data.error || 'Failed to send share')
      }

      setShareSuccess(true)
      setTimeout(() => {
        setShowProfileModal(false)
        setShareSuccess(false)
        setSelectedProfile(null)
        setSearchQuery('')
        setShareMessage('')
      }, 2000)
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Share Button with Dropdown */}
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

              <button
                onClick={handleTextShare}
                className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <MessageCircle className="h-5 w-5 text-purple" />
                <div>
                  <div className="text-white font-medium">Share via Text</div>
                  <div className="text-xs text-white/40">Opens your messaging app</div>
                </div>
              </button>

              <button
                onClick={handleProfileShare}
                className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <Users className="h-5 w-5 text-magenta" />
                <div>
                  <div className="text-white font-medium">Share with a Friend</div>
                  <div className="text-xs text-white/40">Send to another parent on the platform</div>
                </div>
              </button>

              <div className="border-t border-white/10 my-2" />

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

      {/* Profile Share Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4">
          <div className="bg-dark-100 border border-white/20 w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-bold uppercase tracking-wider text-white">
                Share with a Friend
              </h3>
              <button
                onClick={() => {
                  setShowProfileModal(false)
                  setSelectedProfile(null)
                  setSearchQuery('')
                  setShareError(null)
                }}
                className="text-white/40 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {shareSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-neon/10 border border-neon/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-neon" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">Shared Successfully!</h4>
                  <p className="text-white/60">
                    {selectedProfile?.firstName} will receive a notification about this camp.
                  </p>
                </div>
              ) : (
                <>
                  {/* Search Input */}
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                      Search by name or email
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Start typing a name..."
                        className="w-full bg-black border border-white/20 pl-10 pr-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Profile List */}
                  {searching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-neon" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div>
                      <div className="text-xs text-white/40 uppercase tracking-wider mb-2">
                        {searchQuery.length >= 2 ? 'Search Results' : 'Select a Friend'}
                      </div>
                      <div className="max-h-48 overflow-y-auto border border-white/10">
                        {searchResults.map((profile) => (
                          <button
                            key={profile.id}
                            onClick={() => setSelectedProfile(profile)}
                            className={cn(
                              'flex items-center gap-3 w-full px-4 py-3 text-left transition-colors',
                              selectedProfile?.id === profile.id
                                ? 'bg-neon/10 border-l-2 border-neon'
                                : 'hover:bg-white/5'
                            )}
                          >
                            <div className="w-10 h-10 bg-purple/10 border border-purple/30 flex items-center justify-center">
                              <span className="text-purple font-bold">
                                {profile.firstName[0]}
                              </span>
                            </div>
                            <div>
                              <div className="text-white font-medium">
                                {profile.firstName} {profile.lastName}
                              </div>
                              <div className="text-xs text-white/40">{profile.email}</div>
                            </div>
                            {selectedProfile?.id === profile.id && (
                              <Check className="h-4 w-4 text-neon ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : searchQuery.length >= 2 ? (
                    <div className="text-center py-8 text-white/40">
                      No profiles found matching "{searchQuery}"
                    </div>
                  ) : (
                    <div className="text-center py-8 text-white/40">
                      No other users found on the platform
                    </div>
                  )}

                  {/* Selected Profile & Message */}
                  {selectedProfile && (
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-3 p-3 bg-neon/5 border border-neon/20">
                        <div className="w-10 h-10 bg-neon/10 border border-neon/30 flex items-center justify-center">
                          <span className="text-neon font-bold">
                            {selectedProfile.firstName[0]}
                          </span>
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            Sharing with {selectedProfile.firstName} {selectedProfile.lastName}
                          </div>
                          <div className="text-xs text-white/40">{selectedProfile.email}</div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                          Add a message (optional)
                        </label>
                        <textarea
                          value={shareMessage}
                          onChange={(e) => setShareMessage(e.target.value)}
                          rows={3}
                          className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                        />
                      </div>

                      {shareError && (
                        <div className="p-3 bg-magenta/10 border border-magenta/30 text-magenta text-sm">
                          {shareError}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!shareSuccess && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowProfileModal(false)
                    setSelectedProfile(null)
                    setSearchQuery('')
                    setShareError(null)
                  }}
                  className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendShare}
                  disabled={!selectedProfile || sending}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2 font-bold uppercase tracking-wider transition-all',
                    selectedProfile && !sending
                      ? 'bg-neon text-black hover:bg-neon/90'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                  )}
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
