import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Card({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-white shadow-sm', className)}>
      {children}
    </div>
  )
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'dark'
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50',
        size === 'sm' && 'h-8 px-3 text-sm',
        size === 'md' && 'h-9 px-4 text-sm',
        size === 'lg' && 'h-11 px-5 text-base',
        variant === 'primary' && 'bg-brand text-white hover:bg-brand-dark',
        variant === 'secondary' && 'bg-slate-100 text-slate-800 hover:bg-slate-200',
        variant === 'ghost' && 'text-slate-600 hover:bg-slate-100',
        variant === 'outline' && 'border border-border bg-white text-slate-700 hover:bg-slate-50',
        variant === 'dark' && 'bg-slate-900 text-white hover:bg-slate-800',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Badge({
  children,
  className,
  tone = 'default',
}: {
  children: ReactNode
  className?: string
  tone?: 'default' | 'green' | 'blue' | 'red' | 'yellow' | 'pink' | 'purple' | 'slate'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        tone === 'default' && 'bg-slate-100 text-slate-700',
        tone === 'green' && 'bg-emerald-50 text-emerald-700',
        tone === 'blue' && 'bg-sky-50 text-sky-700',
        tone === 'red' && 'bg-rose-50 text-rose-700',
        tone === 'yellow' && 'bg-amber-50 text-amber-700',
        tone === 'pink' && 'bg-pink-50 text-pink-700',
        tone === 'purple' && 'bg-violet-50 text-violet-700',
        tone === 'slate' && 'bg-slate-800 text-white',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'h-9 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none ring-brand/30 placeholder:text-slate-400 focus:ring-2',
        props.className,
      )}
    />
  )
}
