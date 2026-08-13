import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const StickyBoardScrollbar = ({ targetRef, contentKey, ariaLabel = 'Défilement horizontal' }) => {
  const scrollbarRef = useRef(null)
  const syncingRef = useRef(null)
  const frameRef = useRef(null)
  const [metrics, setMetrics] = useState({ visible: false, contentWidth: 0 })

  useEffect(() => {
    const target = targetRef.current
    const scrollbar = scrollbarRef.current
    if (!target || !scrollbar) return undefined

    const updateMetrics = () => {
      setMetrics({
        visible: target.scrollWidth > target.clientWidth + 1,
        contentWidth: target.scrollWidth,
      })
    }

    const releaseSync = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = requestAnimationFrame(() => {
        syncingRef.current = null
      })
    }

    const syncScrollbar = () => {
      if (syncingRef.current === 'scrollbar') return
      syncingRef.current = 'board'
      const targetRange = target.scrollWidth - target.clientWidth
      const scrollbarRange = scrollbar.scrollWidth - scrollbar.clientWidth
      const ratio = targetRange > 0 ? target.scrollLeft / targetRange : 0
      scrollbar.scrollLeft = ratio * scrollbarRange
      releaseSync()
    }

    const syncBoard = () => {
      if (syncingRef.current === 'board') return
      syncingRef.current = 'scrollbar'
      const scrollbarRange = scrollbar.scrollWidth - scrollbar.clientWidth
      const targetRange = target.scrollWidth - target.clientWidth
      const ratio = scrollbarRange > 0 ? scrollbar.scrollLeft / scrollbarRange : 0
      target.scrollLeft = ratio * targetRange
      releaseSync()
    }

    updateMetrics()
    syncScrollbar()
    target.addEventListener('scroll', syncScrollbar, { passive: true })
    scrollbar.addEventListener('scroll', syncBoard, { passive: true })
    window.addEventListener('resize', updateMetrics)

    const resizeObserver = new ResizeObserver(updateMetrics)
    resizeObserver.observe(target)
    const content = target.firstElementChild
    if (content) resizeObserver.observe(content)

    return () => {
      target.removeEventListener('scroll', syncScrollbar)
      scrollbar.removeEventListener('scroll', syncBoard)
      window.removeEventListener('resize', updateMetrics)
      resizeObserver.disconnect()
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [targetRef, contentKey])

  if (typeof document === 'undefined') return null

  return createPortal((
    <div
      ref={scrollbarRef}
      className={`${metrics.visible ? 'md:block' : 'hidden'} sticky-horizontal-scrollbar fixed inset-x-0 bottom-0 z-[60] h-[18px] overflow-x-auto overflow-y-hidden bg-[#F6F7F9] dark:bg-slate-950`}
      aria-label={ariaLabel}
      tabIndex={metrics.visible ? 0 : -1}
    >
      <div className="h-px" style={{ width: metrics.contentWidth }} />
    </div>
  ), document.body)
}

export default StickyBoardScrollbar
