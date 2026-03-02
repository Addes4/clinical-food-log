import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={[
          'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm',
          'placeholder:text-gray-400',
          'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
          'disabled:bg-gray-50 disabled:text-gray-500',
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '',
          className,
        ].join(' ')}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
