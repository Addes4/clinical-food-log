import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={[
          'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm',
          'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
          'disabled:bg-gray-50 disabled:text-gray-500',
          'bg-white',
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '',
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </select>
    )
  }
)

Select.displayName = 'Select'
