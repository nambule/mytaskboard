import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const DateRangePicker = ({ startDate, endDate, onStartDateChange, onEndDateChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeField, setActiveField] = useState('start') // 'start' or 'end'
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    if (startDate) return new Date(startDate)
    if (endDate) return new Date(endDate)
    return now
  })
  const pickerRef = useRef(null)

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const [year, month, day] = dateString.split('-')
    const date = new Date(year, month - 1, day) // Create date in local timezone
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric',
      month: 'short', 
      year: 'numeric'
    })
  }

  const formatDateShort = (dateString) => {
    if (!dateString) return ''
    const [year, month, day] = dateString.split('-')
    const date = new Date(year, month - 1, day) // Create date in local timezone
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const openCalendar = (field) => {
    setActiveField(field)
    setIsOpen(true)
    
    // Set current month based on the field being edited
    if (field === 'start' && startDate) {
      setCurrentMonth(new Date(startDate))
    } else if (field === 'end' && endDate) {
      setCurrentMonth(new Date(endDate))
    } else if (field === 'start' && !startDate && endDate) {
      // Opening start field when only end date exists
      setCurrentMonth(new Date(endDate))
    } else if (field === 'end' && !endDate && startDate) {
      // Opening end field when only start date exists - show month containing start date
      setCurrentMonth(new Date(startDate))
    }
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingWeekday = firstDay.getDay()
    
    // Convert Sunday (0) to be 7, and Monday (1) to be 0 for European week start
    const adjustedStartingWeekday = startingWeekday === 0 ? 6 : startingWeekday - 1

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < adjustedStartingWeekday; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getNextMonth = (date) => {
    const nextMonth = new Date(date)
    nextMonth.setMonth(date.getMonth() + 1)
    return nextMonth
  }

  const isDateInRange = (date) => {
    if (!startDate || !endDate || !date) return false
    const start = new Date(startDate)
    const end = new Date(endDate)
    return date > start && date < end
  }

  const isDateSelected = (date) => {
    if (!date) return false
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    return dateStr === startDate || dateStr === endDate
  }

  const handleDateClick = (date) => {
    // Use local date formatting to avoid timezone issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    const clickedDate = new Date(year, date.getMonth(), date.getDate())
    
    // Enhanced workflow: auto-switch to end date field for seamless range selection
    if (!startDate && !endDate) {
      // No dates selected: clicked date becomes start date, auto-select end date field
      onStartDateChange(dateStr)
      setActiveField('end') // Automatically switch to end date selection
    } else if (startDate && !endDate) {
      // Only start date selected
      const start = new Date(startDate)
      if (clickedDate >= start) {
        // Clicked date is after/on start: set as end date, keep calendar open for further adjustments
        onEndDateChange(dateStr)
        // Keep calendar open and end field active for potential adjustments
      } else {
        // Clicked date is before start: update start date, auto-select end date field
        onStartDateChange(dateStr)
        setActiveField('end')
      }
    } else if (!startDate && endDate) {
      // Only end date selected (edge case)
      const end = new Date(endDate)
      if (clickedDate <= end) {
        onStartDateChange(dateStr)
        setActiveField('end') // Auto-select end field for completion
      } else {
        onEndDateChange(dateStr)
      }
    } else {
      // Both dates selected: enhanced logic based on active field and click position
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      if (activeField === 'start') {
        // User clicked start field, then clicked a date
        onStartDateChange(dateStr)
        if (clickedDate >= end) {
          // New start date is after current end date: clear end date and switch to end field
          onEndDateChange('')
        }
        setActiveField('end') // Always switch to end field after setting start date
      } else {
        // activeField === 'end' - user is selecting/changing end date
        if (clickedDate >= start) {
          // Valid end date: set it
          onEndDateChange(dateStr)
          // Keep end field active for potential adjustments (multiple clicks changing due date)
        } else {
          // Clicked before start date: this becomes the new start date, auto-select end field
          onStartDateChange(dateStr)
          onEndDateChange('')
          setActiveField('end')
        }
      }
    }
  }

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      newMonth.setMonth(prev.getMonth() + direction)
      return newMonth
    })
  }

  const getDateStatus = (date) => {
    if (!date) return ''
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    const isStart = startDate && dateStr === startDate
    const isEnd = endDate && dateStr === endDate
    const inRange = isDateInRange(date)
    const isToday = date.toDateString() === new Date().toDateString()

    if (isStart && isEnd) {
      return 'start-end'
    } else if (isStart) {
      return 'start'
    } else if (isEnd) {
      return 'end'
    } else if (inRange) {
      return 'in-range'
    } else if (isToday) {
      return 'today'
    }
    return ''
  }

  const getDateClassName = (date) => {
    if (!date) return 'invisible'
    
    const status = getDateStatus(date)
    const baseClasses = 'w-7 h-7 flex items-center justify-center text-xs cursor-pointer relative z-10 transition-colors'
    
    switch (status) {
      case 'start-end':
        return `${baseClasses} bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800`
      case 'start':
        return `${baseClasses} bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800`
      case 'end':
        return `${baseClasses} bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800`
      case 'in-range':
        return `${baseClasses} bg-slate-100 text-slate-900 hover:bg-slate-200`
      case 'today':
        return `${baseClasses} text-slate-900 font-medium border border-slate-900 rounded-full hover:bg-slate-50`
      default:
        return `${baseClasses} text-slate-700 hover:bg-slate-100 rounded-full`
    }
  }

  const renderCalendarMonth = (monthDate) => (
    <div className="flex-1">
      {/* Month Header */}
      <div className="text-center mb-3">
        <h3 className="font-medium text-slate-900 text-sm">
          {months[monthDate.getMonth()]} {monthDate.getFullYear()}
        </h3>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map(day => (
          <div key={day} className="w-7 h-6 flex items-center justify-center text-xs font-medium text-slate-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {getDaysInMonth(monthDate).map((date, index) => (
          <div key={index} className="relative w-7 h-7 flex items-center justify-center">
            {/* Background for in-range dates */}
            {date && isDateInRange(date) && (
              <div className="absolute inset-0 bg-slate-100 -z-10" />
            )}
            <button
              type="button"
              onClick={() => date && handleDateClick(date)}
              className={getDateClassName(date)}
            >
              {date?.getDate()}
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="relative" ref={pickerRef}>
      {/* Two Input Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-slate-600 mb-1">Début</label>
          <button
            type="button"
            onClick={() => !disabled && openCalendar('start')}
            className={`w-full rounded-xl border px-3 py-2 text-left flex items-center gap-2 text-sm ${
              disabled 
                ? 'bg-slate-50 text-slate-400 border-slate-200' 
                : isOpen && activeField === 'start'
                  ? 'border-slate-400 bg-white shadow-sm'
                  : 'border-slate-300 hover:border-slate-400 bg-white'
            }`}
            disabled={disabled}
          >
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>{startDate ? formatDateShort(startDate) : 'Ajouter'}</span>
          </button>
        </div>
        
        <div>
          <label className="block text-sm text-slate-600 mb-1">Fin</label>
          <button
            type="button"
            onClick={() => !disabled && openCalendar('end')}
            className={`w-full rounded-xl border px-3 py-2 text-left flex items-center gap-2 text-sm ${
              disabled 
                ? 'bg-slate-50 text-slate-400 border-slate-200' 
                : isOpen && activeField === 'end'
                  ? 'border-slate-400 bg-white shadow-sm'
                  : 'border-slate-300 hover:border-slate-400 bg-white'
            }`}
            disabled={disabled}
          >
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>{endDate ? formatDateShort(endDate) : 'Ajouter'}</span>
          </button>
        </div>
      </div>

      {/* Calendar Popup */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[min(480px,calc(100vw-3rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
          {/* Navigation Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="text-xs text-slate-600">
              Modification : <span className="font-medium">{activeField === 'start' ? 'début' : 'fin'}</span>
            </div>
            
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Two Month View */}
          <div className="flex gap-6">
            {renderCalendarMonth(currentMonth)}
            <div className="hidden sm:block">{renderCalendarMonth(getNextMonth(currentMonth))}</div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-600">
              {startDate && endDate ? (
                <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
              ) : activeField === 'start' ? (
                'Sélectionnez la date de début'
              ) : (
                'Sélectionnez la date de fin'
              )}
            </div>
            
            <div className="flex gap-2">
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    onStartDateChange('')
                    onEndDateChange('')
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Effacer
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Terminé
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DateRangePicker
