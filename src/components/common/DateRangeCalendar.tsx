import React, { useState, useRef, useEffect } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { CalendarDays } from 'lucide-react';

interface DateRangeCalendarProps {
  checkInDate: string; // yyyy-MM-dd
  checkOutDate: string; // yyyy-MM-dd
  onChange: (checkInDate: string, checkOutDate: string) => void;
  minDate?: Date;
  label?: string;
}

/**
 * A single calendar popover for picking both a check-in and check-out date
 * as one continuous stay range, instead of two separate native date inputs.
 */
export const DateRangeCalendar: React.FC<DateRangeCalendarProps> = ({
  checkInDate,
  checkOutDate,
  onChange,
  minDate,
  label = 'Stay Dates',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedRange: DateRange = {
    from: checkInDate ? parseISO(checkInDate) : undefined,
    to: checkOutDate ? parseISO(checkOutDate) : undefined,
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (selected: DateRange | undefined) => {
    if (!selected) return;

    const newFrom = selected.from ? format(selected.from, 'yyyy-MM-dd') : checkInDate;
    const newTo = selected.to ? format(selected.to, 'yyyy-MM-dd') : checkOutDate;

    onChange(newFrom, newTo);

    // Auto-close once a full, distinct range has been picked
    if (selected.from && selected.to && selected.from.getTime() !== selected.to.getTime()) {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-slate-600 mb-1 font-medium">{label} *</label>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="w-full p-2 border border-slate-300 rounded-lg bg-white flex items-center gap-2 text-left font-mono hover:border-slate-400 transition-colors focus:outline-none focus:ring-1 focus:ring-slate-900"
      >
        <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-800">
          {checkInDate || 'Check-in'} <span className="text-slate-400">→</span> {checkOutDate || 'Check-out'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-3 left-0">
          <DayPicker
            mode="range"
            numberOfMonths={2}
            selected={selectedRange}
            onSelect={handleSelect}
            disabled={minDate ? { before: minDate } : undefined}
            classNames={{
              months: 'flex flex-col sm:flex-row gap-4',
              month: 'space-y-2',
              month_caption: 'flex justify-center items-center py-1 font-semibold text-xs text-slate-900',
              nav: 'flex items-center justify-between absolute inset-x-2 top-1 z-10',
              button_previous: 'p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer',
              button_next: 'p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer',
              month_grid: 'w-full border-collapse mt-1',
              weekdays: 'flex',
              weekday: 'w-8 h-8 flex items-center justify-center text-[10px] font-semibold text-slate-400 uppercase',
              week: 'flex',
              day: 'w-8 h-8 p-0 text-center text-xs relative',
              day_button: 'w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer',
              selected: 'bg-slate-900! text-white! rounded-full',
              range_start: 'bg-slate-900! text-white! rounded-full',
              range_end: 'bg-slate-900! text-white! rounded-full',
              range_middle: 'bg-slate-100! text-slate-900! rounded-none',
              today: 'font-bold text-amber-600',
              disabled: 'text-slate-300 cursor-not-allowed hover:bg-transparent',
              outside: 'text-slate-300',
            }}
          />
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-400">
              Pick a check-in date, then a check-out date.
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
