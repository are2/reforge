interface AvatarProps {
  initials: string
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md'
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-6 w-6 text-[0.625rem]',
  md: 'h-8 w-8 text-xs',
}

export function Avatar({ initials, variant = 'primary', size = 'md' }: AvatarProps) {
  const bg =
    variant === 'primary'
      ? 'bg-primary-400 dark:bg-primary-400'
      : 'bg-secondary-400 dark:bg-secondary-400'

  const text =
    variant === 'primary'
      ? 'text-primary-900 dark:text-neutral-0'
      : 'text-secondary-900 dark:text-neutral-0'

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded font-semibold select-none ${bg} ${text} ${sizeClasses[size]}`}
    >
      {initials}
    </span>
  )
}
