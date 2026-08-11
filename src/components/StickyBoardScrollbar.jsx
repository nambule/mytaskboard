import React, { useEffect, useRef, useState } from 'react'

const StickyBoardScrollbar = ({ targetRef, contentKey }) => {
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
    const board = target.querySelector('.board-grid')
    if (board) resizeObserver.observe(board)

    return () => {
      target.removeEventListener('scroll', syncScrollbar)
      scrollbar.removeEventListener('scroll', syncBoard)
      window.removeEventListener('resize', updateMetrics)
      resizeObserver.disconnect()
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [targetRef, contentKey])

  return (
    <div
      ref={scrollbarRef}
      className={`${metrics.visible ? 'md:block' : 'hidden'} scrollbar-subtle fixed inset-x-0 bottom-0 z-50 h-5 overflow-x-auto overflow-y-hidden border-t border-slate-200 bg-[#F6F7F9]/95 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95`}
      aria-label="Défilement horizontal du tableau"
    >
      <div className="h-px" style={{ width: metrics.contentWidth }} />
    </div>
  )
}

export default StickyBoardScrollbar
