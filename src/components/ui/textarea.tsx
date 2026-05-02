import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border bg-white px-3 py-2',
          'text-sm font-inter text-brand-text placeholder:text-gray-400',
          'resize-y transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          hasError
            ? 'border-red-500 focus-visible:ring-red-500'
            : 'border-brand-border hover:border-gold/60',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
