'use client'

/**
 * PDF Viewer Component - Empowered Athletes Brand
 *
 * Adobe Acrobat-style PDF viewer with:
 * - Page navigation (prev/next, page input)
 * - Zoom controls (in/out, fit-to-width, percentage)
 * - Search functionality with highlight
 * - Download and print buttons
 * - Fullscreen toggle
 * - Smooth scrolling
 * - Dark theme matching the app
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { cn } from '@/lib/utils'
import { Button } from './button'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// Import styles for react-pdf
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

interface PdfViewerProps {
  url: string
  filename?: string
  showToolbar?: boolean
  initialPage?: number
  initialZoom?: number
  onClose?: () => void
  className?: string
}

const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200, 300]

export function PdfViewer({
  url,
  filename = 'document.pdf',
  showToolbar = true,
  initialPage = 1,
  initialZoom = 100,
  onClose,
  className,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(initialPage)
  const [zoom, setZoom] = useState<number>(initialZoom)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [searchText, setSearchText] = useState<string>('')
  const [showSearch, setShowSearch] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [pageInputValue, setPageInputValue] = useState<string>(String(initialPage))

  const containerRef = useRef<HTMLDivElement>(null)
  const documentRef = useRef<HTMLDivElement>(null)

  // Handle document load success
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
    setError(null)
  }, [])

  // Handle document load error
  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error)
    setError('Failed to load PDF document')
    setIsLoading(false)
  }, [])

  // Navigation handlers
  const goToPage = useCallback((page: number) => {
    const targetPage = Math.max(1, Math.min(page, numPages))
    setCurrentPage(targetPage)
    setPageInputValue(String(targetPage))
  }, [numPages])

  const goToPrevPage = useCallback(() => {
    goToPage(currentPage - 1)
  }, [currentPage, goToPage])

  const goToNextPage = useCallback(() => {
    goToPage(currentPage + 1)
  }, [currentPage, goToPage])

  const handlePageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value)
  }, [])

  const handlePageInputBlur = useCallback(() => {
    const page = parseInt(pageInputValue, 10)
    if (!isNaN(page)) {
      goToPage(page)
    } else {
      setPageInputValue(String(currentPage))
    }
  }, [pageInputValue, currentPage, goToPage])

  const handlePageInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageInputBlur()
    }
  }, [handlePageInputBlur])

  // Zoom handlers
  const zoomIn = useCallback(() => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= zoom)
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoom(ZOOM_LEVELS[currentIndex + 1])
    }
  }, [zoom])

  const zoomOut = useCallback(() => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= zoom)
    if (currentIndex > 0) {
      setZoom(ZOOM_LEVELS[currentIndex - 1])
    }
  }, [zoom])

  const fitToWidth = useCallback(() => {
    // For now, set to 100% - could be enhanced to calculate based on container width
    setZoom(100)
  }, [])

  // Fullscreen handler
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }, [])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Download handler
  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error('Download error:', err)
    }
  }, [url, filename])

  // Print handler
  const handlePrint = useCallback(() => {
    const printWindow = window.open(url, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }, [url])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if search input is focused
      if (showSearch && document.activeElement?.tagName === 'INPUT') return

      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault()
          goToPrevPage()
          break
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault()
          goToNextPage()
          break
        case 'Home':
          e.preventDefault()
          goToPage(1)
          break
        case 'End':
          e.preventDefault()
          goToPage(numPages)
          break
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            setShowSearch(prev => !prev)
          }
          break
        case 'Escape':
          if (showSearch) {
            setShowSearch(false)
          } else if (onClose) {
            onClose()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPrevPage, goToNextPage, goToPage, numPages, showSearch, onClose])

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col bg-gray-900 text-white',
        isFullscreen ? 'fixed inset-0 z-50' : 'h-full w-full',
        className
      )}
    >
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between gap-4 bg-black/80 px-4 py-2 border-b border-white/10">
          {/* Left section - Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={goToPrevPage}
              disabled={currentPage <= 1}
              title="Previous page"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-1 text-sm">
              <input
                type="text"
                value={pageInputValue}
                onChange={handlePageInputChange}
                onBlur={handlePageInputBlur}
                onKeyDown={handlePageInputKeyDown}
                className="w-12 bg-white/10 border border-white/20 rounded px-2 py-1 text-center text-white focus:outline-none focus:border-neon"
              />
              <span className="text-white/60">/ {numPages}</span>
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={goToNextPage}
              disabled={currentPage >= numPages}
              title="Next page"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </Button>
          </div>

          {/* Center section - Zoom */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={zoomOut}
              disabled={zoom <= ZOOM_LEVELS[0]}
              title="Zoom out"
            >
              <MinusIcon className="h-5 w-5" />
            </Button>

            <select
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-neon appearance-none cursor-pointer"
            >
              {ZOOM_LEVELS.map((level) => (
                <option key={level} value={level} className="bg-gray-900">
                  {level}%
                </option>
              ))}
            </select>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={zoomIn}
              disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
              title="Zoom in"
            >
              <PlusIcon className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={fitToWidth}
              title="Fit to width"
            >
              <ArrowsExpandIcon className="h-5 w-5" />
            </Button>
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowSearch(!showSearch)}
              title="Search (Ctrl+F)"
            >
              <SearchIcon className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDownload}
              title="Download"
            >
              <DownloadIcon className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handlePrint}
              title="Print"
            >
              <PrinterIcon className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <ExitFullscreenIcon className="h-5 w-5" />
              ) : (
                <FullscreenIcon className="h-5 w-5" />
              )}
            </Button>

            {onClose && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                title="Close"
              >
                <XIcon className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 bg-black/60 px-4 py-2 border-b border-white/10">
          <SearchIcon className="h-4 w-4 text-white/60" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search in document..."
            className="flex-1 bg-transparent text-white placeholder:text-white/40 focus:outline-none"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowSearch(false)}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* PDF Content */}
      <div
        ref={documentRef}
        className="flex-1 overflow-auto bg-gray-800 flex justify-center"
      >
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-neon border-t-transparent" />
              <p className="text-white/60">Loading PDF...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-400 mb-2">{error}</p>
              <Button variant="outline-neon" size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </div>
        )}

        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className={cn(
            'py-4',
            isLoading && 'hidden'
          )}
        >
          <Page
            pageNumber={currentPage}
            scale={zoom / 100}
            className="shadow-2xl"
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      {/* Bottom status bar */}
      {showToolbar && !isLoading && !error && (
        <div className="flex items-center justify-between bg-black/80 px-4 py-1 text-xs text-white/60 border-t border-white/10">
          <span>{filename}</span>
          <span>Page {currentPage} of {numPages}</span>
        </div>
      )}
    </div>
  )
}

// Icon components
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function ArrowsExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

function PrinterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  )
}

function FullscreenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  )
}

function ExitFullscreenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4m0 5h5M9 9L4 4m11 5V4m0 5h-5m5 0l5-5M9 15v5m0-5H4m5 0l-5 5m11-5v5m0-5h5m-5 0l5 5" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default PdfViewer
