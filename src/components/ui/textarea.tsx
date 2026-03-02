import { TextareaHTMLAttributes, forwardRef } from 'react'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={[
          'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm',
          'placeholder:text-gray-400 resize-y',
          'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
          'disabled:bg-gray-50 disabled:text-gray-500',
          className,
        ].join(' ')}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
