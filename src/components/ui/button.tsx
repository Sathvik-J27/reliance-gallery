import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base styles shared by all variants
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md',
    'text-sm font-medium font-inter',
    'transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        // Gold background, black text — primary brand CTA
        default:
          'bg-gold text-black hover:bg-gold-hover active:bg-gold-hover shadow-sm',
        // Transparent with visible border
        outline:
          'border border-brand-text bg-transparent text-brand-text hover:bg-brand-text hover:text-brand-bg',
        // No border, no background
        ghost:
          'bg-transparent text-brand-text hover:bg-brand-border hover:text-brand-text',
        // Red destructive actions
        destructive:
          'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
        // Subtle secondary link style
        link: 'text-gold underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-md px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
