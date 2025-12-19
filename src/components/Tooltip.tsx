import React, { useState, ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
  disabled?: boolean
}

export function Tooltip({ content, children, disabled = false }: TooltipProps) {
  const [show, setShow] = useState(false)

  if (!disabled) {
    return <>{children}</>
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs text-white bg-neutral-900 border border-white/10 rounded whitespace-nowrap z-50 pointer-events-none">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
        </div>
      )}
    </div>
  )
}
