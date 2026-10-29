import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      data-ui="calendar"
      showOutsideDays={showOutsideDays}
      className={cn('p-3 select-none', className)}
      classNames={{
        months: 'flex flex-col gap-4',
        month: 'relative flex flex-col gap-3',
        month_caption: 'flex h-9 items-center justify-center',
        caption_label: 'text-sm font-semibold tracking-wide',
        nav: 'mt-4 absolute top-0 inset-x-0 z-10 flex h-9 items-center justify-between px-1',
        button_previous:
          'h-8 w-8 inline-flex items-center justify-center rounded-lg' +
          ' text-muted-foreground transition-colors hover:bg-muted hover:text-foreground' +
          ' focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        button_next:
          'h-8 w-8 inline-flex items-center justify-center rounded-lg' +
          ' text-muted-foreground transition-colors hover:bg-muted hover:text-foreground' +
          ' focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        month_grid: 'w-full border-collapse',
        weekdays: '',
        weekday:
          'w-9 pb-1 text-center text-[0.7rem] font-medium uppercase tracking-widest text-muted-foreground',
        week: '',
        day: 'p-0 text-center',
        day_button:
          'mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-sm font-normal' +
          ' transition-all duration-150' +
          ' hover:bg-muted hover:text-foreground' +
          ' focus:outline-none focus-visible:ring-2 focus-visible:ring-ring' +
          ' disabled:pointer-events-none disabled:opacity-40',
        selected:
          'bg-gradient-to-br from-amber-400 to-cyan-400 text-white rounded-lg shadow-sm font-semibold',
        today:
          'ring-2 ring-primary/50 ring-offset-1 ring-offset-background rounded-lg font-semibold text-primary',
        outside: 'opacity-30',
        disabled: 'pointer-events-none opacity-30',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        PreviousMonthButton: ({ ...btnProps }) => (
          <button {...(btnProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        ),
        NextMonthButton: ({ ...btnProps }) => (
          <button {...(btnProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ),
      }}
      {...props}
    />
  );
}

Calendar.displayName = 'Calendar';
export { Calendar };
