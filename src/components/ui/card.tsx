import { HTMLAttributes } from 'react'

export function Card({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={['bg-white rounded-lg border border-gray-200 shadow-sm', className].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['px-6 py-4 border-b border-gray-100', className].join(' ')} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['px-6 py-4', className].join(' ')} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['px-6 py-4 border-t border-gray-100', className].join(' ')} {...props}>
      {children}
    </div>
  )
}
