# Phase 1d — Web Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a browser-usable portal for the Phase 1c listings API. Users can browse listings, view detail pages, create+publish listings with images, and manage their own listings from a dashboard. A one-click "Dev login" unlocks authed pages (real auth UI deferred).

**Architecture:** Next.js 15 Server Components first; client islands only for interactivity (forms, filters, uploads, locale switch). Two write paths for the browser — `/api/web/session` for cookie lifecycle and the existing `/api/proxy/[...path]` for all other mutations. Single-locale i18n scaffold via `next-intl` with `ru` populated and `ky` stubbed.

**Tech Stack:** Next.js 15 + React 19 + TypeScript strict, Tailwind + shadcn/ui, `react-hook-form` + `zod` resolver, `next-intl@3`, `lucide-react`, vitest + Testing Library (jsdom).

**Design spec:** [docs/superpowers/specs/2026-04-20-phase-1d-web-frontend-design.md](../specs/2026-04-20-phase-1d-web-frontend-design.md).

**Branch:** `feat/phase-1d-web-frontend`.

---

## Pre-flight

Before starting Task 1, create the feature branch from `main`:

```bash
git checkout main && git pull --ff-only
git checkout -b feat/phase-1d-web-frontend
```

Confirm clean working tree:

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

---

## Task 1: Install frontend dependencies

**Files:**
- Modify: `apps/web/package.json` (via pnpm)

- [ ] **Step 1: Install production deps**

Run:

```bash
pnpm --filter=@kgm/web add \
  next-intl@^3.26.0 \
  react-hook-form@^7.54.0 \
  @hookform/resolvers@^3.10.0 \
  lucide-react@^0.460.0 \
  class-variance-authority@^0.7.1 \
  clsx@^2.1.1 \
  tailwind-merge@^2.5.5 \
  tailwindcss-animate@^1.0.7 \
  @radix-ui/react-dialog@^1.1.4 \
  @radix-ui/react-select@^2.1.4 \
  @radix-ui/react-label@^2.1.1 \
  @radix-ui/react-slot@^1.1.1 \
  @radix-ui/react-toast@^1.2.4
```

Expected: install completes, `apps/web/package.json` `dependencies` updated.

- [ ] **Step 2: Install dev deps**

Run:

```bash
pnpm --filter=@kgm/web add -D \
  @testing-library/react@^16.1.0 \
  @testing-library/jest-dom@^6.6.3 \
  @testing-library/user-event@^14.5.2
```

Expected: `devDependencies` updated.

- [ ] **Step 3: Verify install**

Run:

```bash
pnpm --filter=@kgm/web list --depth=0 2>&1 | head -30
```

Expected: all packages listed. No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): add UI kit, forms, i18n, and testing deps"
```

---

## Task 2: Vitest + Testing Library setup

**Files:**
- Modify: `apps/web/vitest.config.ts`
- Create: `apps/web/src/test/setup.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/test/setup-smoke.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

describe('vitest setup', () => {
  it('has jest-dom matchers', () => {
    const div = document.createElement('div')
    div.textContent = 'hello'
    expect(div).toHaveTextContent('hello')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter=@kgm/web test
```

Expected: FAIL — `toHaveTextContent` is not a function.

- [ ] **Step 3: Add setup file**

Create `apps/web/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
```

- [ ] **Step 4: Wire setup file in vitest config**

Replace contents of `apps/web/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.spec.{ts,tsx}'],
    globals: false,
  },
})
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
pnpm --filter=@kgm/web test
```

Expected: PASS. 1 test passes.

- [ ] **Step 6: Commit**

```bash
git add apps/web/vitest.config.ts apps/web/src/test/setup.ts apps/web/src/test/setup-smoke.spec.ts
git commit -m "test(web): wire vitest jsdom + Testing Library setup"
```

---

## Task 3: shadcn/ui init and core components

**Files:**
- Create: `apps/web/src/lib/utils.ts`
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/input.tsx`
- Create: `apps/web/src/components/ui/textarea.tsx`
- Create: `apps/web/src/components/ui/label.tsx`
- Create: `apps/web/src/components/ui/select.tsx`
- Create: `apps/web/src/components/ui/dialog.tsx`
- Create: `apps/web/src/components/ui/toast.tsx`
- Create: `apps/web/src/components/ui/toaster.tsx`
- Create: `apps/web/src/components/ui/card.tsx`
- Create: `apps/web/src/components/ui/badge.tsx`
- Create: `apps/web/src/components/ui/form.tsx`
- Create: `apps/web/src/hooks/use-toast.ts`
- Modify: `apps/web/tailwind.config.ts`
- Modify: `apps/web/src/app/globals.css`

**Note:** We write shadcn components by hand (not CLI) because the CLI requires interactive init and writes to paths our setup doesn't match. The code below is the standard shadcn output.

- [ ] **Step 1: Write `cn` helper**

Create `apps/web/src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 2: Update tailwind config with shadcn theme**

Replace contents of `apps/web/tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
}

export default config
```

- [ ] **Step 3: Update globals.css with CSS variables**

Replace contents of `apps/web/src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

- [ ] **Step 4: Write Button component**

Create `apps/web/src/components/ui/button.tsx`:

```tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'

export { buttonVariants }
```

- [ ] **Step 5: Write Input, Textarea, Label**

Create `apps/web/src/components/ui/input.tsx`:

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
```

Create `apps/web/src/components/ui/textarea.tsx`:

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
```

Create `apps/web/src/components/ui/label.tsx`:

```tsx
'use client'
import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName
```

- [ ] **Step 6: Write Card + Badge**

Create `apps/web/src/components/ui/card.tsx`:

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props} />
  ),
)
Card.displayName = 'Card'

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  ),
)
CardHeader.displayName = 'CardHeader'

export const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
  ),
)
CardTitle.displayName = 'CardTitle'

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />,
)
CardContent.displayName = 'CardContent'

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
)
CardFooter.displayName = 'CardFooter'
```

Create `apps/web/src/components/ui/badge.tsx`:

```tsx
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-green-600 text-white',
        warning: 'border-transparent bg-amber-500 text-white',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
```

- [ ] **Step 7: Write Dialog, Select, Toast primitives**

Create `apps/web/src/components/ui/dialog.tsx`:

```tsx
'use client'
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0', className)}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn('fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg', className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
)
DialogFooter.displayName = 'DialogFooter'

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName
```

Create `apps/web/src/components/ui/select.tsx`:

```tsx
'use client'
import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn('flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50', className)}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn('relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md', className)}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport className={cn('p-1', position === 'popper' && 'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]')}>
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn('relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className)}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName
```

Create `apps/web/src/components/ui/toast.tsx`:

```tsx
'use client'
import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const ToastProvider = ToastPrimitive.Provider

export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn('fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]', className)}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitive.Viewport.displayName

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        destructive: 'destructive border-destructive bg-destructive text-destructive-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => (
  <ToastPrimitive.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />
))
Toast.displayName = ToastPrimitive.Root.displayName

export const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title ref={ref} className={cn('text-sm font-semibold', className)} {...props} />
))
ToastTitle.displayName = ToastPrimitive.Title.displayName

export const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description ref={ref} className={cn('text-sm opacity-90', className)} {...props} />
))
ToastDescription.displayName = ToastPrimitive.Description.displayName

export const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn('absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100', className)}
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitive.Close>
))
ToastClose.displayName = ToastPrimitive.Close.displayName

export type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
export type ToastActionElement = React.ReactElement
```

- [ ] **Step 8: Write `use-toast` hook and Toaster**

Create `apps/web/src/hooks/use-toast.ts` (shadcn's canonical implementation, trimmed):

```ts
'use client'
import * as React from 'react'
import type { ToastProps, ToastActionElement } from '@/components/ui/toast'

const TOAST_LIMIT = 3
const TOAST_REMOVE_DELAY = 5000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type Action =
  | { type: 'ADD_TOAST'; toast: ToasterToast }
  | { type: 'UPDATE_TOAST'; toast: Partial<ToasterToast> & { id: string } }
  | { type: 'DISMISS_TOAST'; toastId?: string }
  | { type: 'REMOVE_TOAST'; toastId?: string }

interface State { toasts: ToasterToast[] }

const listeners: Array<(state: State) => void> = []
let memoryState: State = { toasts: [] }

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

function addToRemoveQueue(toastId: string) {
  if (toastTimeouts.has(toastId)) return
  const t = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({ type: 'REMOVE_TOAST', toastId })
  }, TOAST_REMOVE_DELAY)
  toastTimeouts.set(toastId, t)
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TOAST':
      return { ...state, toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) }
    case 'UPDATE_TOAST':
      return { ...state, toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)) }
    case 'DISMISS_TOAST': {
      const { toastId } = action
      if (toastId) addToRemoveQueue(toastId)
      else state.toasts.forEach((t) => addToRemoveQueue(t.id))
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === toastId || toastId === undefined ? { ...t, open: false } : t)),
      }
    }
    case 'REMOVE_TOAST':
      return { ...state, toasts: action.toastId ? state.toasts.filter((t) => t.id !== action.toastId) : [] }
  }
}

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((l) => l(memoryState))
}

export function toast(props: Omit<ToasterToast, 'id'>) {
  const id = genId()
  dispatch({
    type: 'ADD_TOAST',
    toast: { ...props, id, open: true, onOpenChange: (open) => { if (!open) dispatch({ type: 'DISMISS_TOAST', toastId: id }) } },
  })
  return { id, dismiss: () => dispatch({ type: 'DISMISS_TOAST', toastId: id }) }
}

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState)
  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const i = listeners.indexOf(setState)
      if (i > -1) listeners.splice(i, 1)
    }
  }, [])
  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  }
}
```

Create `apps/web/src/components/ui/toaster.tsx`:

```tsx
'use client'
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'

export function Toaster() {
  const { toasts } = useToast()
  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
```

- [ ] **Step 9: Write Form component (RHF adapter)**

Create `apps/web/src/components/ui/form.tsx`:

```tsx
'use client'
import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { Slot } from '@radix-ui/react-slot'
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export const Form = FormProvider

type FormFieldContextValue<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = { name: TName }
const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue)

export function FormField<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>({ ...props }: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

type FormItemContextValue = { id: string }
const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue)

export const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId()
    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn('space-y-2', className)} {...props} />
      </FormItemContext.Provider>
    )
  },
)
FormItem.displayName = 'FormItem'

export function useFormField() {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()
  const fieldState = getFieldState(fieldContext.name, formState)
  if (!fieldContext) throw new Error('useFormField must be used inside <FormField>')
  const { id } = itemContext
  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

export const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()
  return <Label ref={ref} className={cn(error && 'text-destructive', className)} htmlFor={formItemId} {...props} />
})
FormLabel.displayName = 'FormLabel'

export const FormControl = React.forwardRef<React.ElementRef<typeof Slot>, React.ComponentPropsWithoutRef<typeof Slot>>(
  ({ ...props }, ref) => {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField()
    return (
      <Slot
        ref={ref}
        id={formItemId}
        aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
        aria-invalid={!!error}
        {...props}
      />
    )
  },
)
FormControl.displayName = 'FormControl'

export const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { error, formMessageId } = useFormField()
    const body = error ? String(error?.message ?? '') : children
    if (!body) return null
    return (
      <p ref={ref} id={formMessageId} className={cn('text-sm font-medium text-destructive', className)} {...props}>
        {body}
      </p>
    )
  },
)
FormMessage.displayName = 'FormMessage'
```

- [ ] **Step 10: Smoke test one component**

Create `apps/web/src/components/ui/button.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })
  it('applies destructive variant class', () => {
    render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-destructive')
  })
})
```

- [ ] **Step 11: Run all tests**

Run:

```bash
pnpm --filter=@kgm/web test
```

Expected: PASS. All tests green.

- [ ] **Step 12: Commit**

```bash
git add apps/web/src apps/web/tailwind.config.ts
git commit -m "feat(web): add shadcn/ui core components, theme, and form adapter"
```

---

## Task 4: Seed dev user and sample listings

**Files:**
- Modify: `apps/api/prisma/seed.ts`

Context: the seed today only inserts categories (54 entries under 11 roots). We add a dev user and 3 ACTIVE listings owned by that user so that browsing pages render data immediately after `db:seed`.

- [ ] **Step 1: Read current seed**

Run:

```bash
wc -l apps/api/prisma/seed.ts
```

Note the current line count for context.

- [ ] **Step 2: Extend seed with dev user + sample listings**

Add to the bottom of `apps/api/prisma/seed.ts`, replacing the last `main().finally()` block. Locate `async function main()` — add these two functions before it and call them inside `main()`:

```ts
import * as bcrypt from 'bcrypt'

async function seedDevUser(): Promise<string> {
  const passwordHash = await bcrypt.hash('devpass123', 12)
  const user = await prisma.user.upsert({
    where: { email: 'dev@kgm.local' },
    update: {},
    create: {
      email: 'dev@kgm.local',
      phone: '+996700000000',
      passwordHash,
      firstName: 'Dev',
      lastName: 'Seller',
      phoneVerifiedAt: new Date(),
      isActive: true,
    },
  })
  return user.id
}

async function seedSampleListings(sellerId: string): Promise<void> {
  const electronics = await prisma.category.findFirst({ where: { slug: 'phones' } })
  const transport = await prisma.category.findFirst({ where: { slug: 'cars' } })
  const home = await prisma.category.findFirst({ where: { slug: 'furniture' } })
  if (!electronics || !transport || !home) {
    throw new Error('seed: expected leaf categories not found; run category seed first')
  }
  const samples = [
    {
      title: 'iPhone 13 Pro 256GB',
      description: 'Отличное состояние, полный комплект, использовался 1 год. Без царапин, батарея 95%.',
      price: '65000',
      condition: 'USED' as const,
      categoryId: electronics.id,
      location: 'Бишкек',
    },
    {
      title: 'Toyota Camry 2019',
      description: 'Автомобиль в идеальном состоянии. Один владелец, сервисная история, без ДТП.',
      price: '1450000',
      condition: 'USED' as const,
      categoryId: transport.id,
      location: 'Бишкек',
    },
    {
      title: 'Диван угловой новый',
      description: 'Новый диван из салона, доставка по городу. Материал: экокожа, цвет бежевый.',
      price: '42000',
      condition: 'NEW' as const,
      categoryId: home.id,
      location: 'Ош',
    },
  ]
  for (const s of samples) {
    await prisma.listing.upsert({
      where: { id: `seed-${s.title.slice(0, 20)}` },
      update: {},
      create: {
        id: `seed-${s.title.slice(0, 20)}`,
        title: s.title,
        description: s.description,
        price: s.price,
        currency: 'KGS',
        condition: s.condition,
        status: 'ACTIVE',
        location: s.location,
        sellerId,
        categoryId: s.categoryId,
      },
    })
  }
}
```

Then inside the existing `async function main()` — after the existing category seed — append:

```ts
  const devUserId = await seedDevUser()
  await seedSampleListings(devUserId)
  console.log('✓ seeded dev user and sample listings')
```

Ensure `import * as bcrypt from 'bcrypt'` is at the top of the file with other imports (moving grouping as needed).

- [ ] **Step 3: Install bcrypt if seed script does not already have it**

Check:

```bash
grep -q '"bcrypt"' apps/api/package.json && echo "present" || echo "missing"
```

If missing:

```bash
pnpm --filter=@kgm/api add bcrypt
pnpm --filter=@kgm/api add -D @types/bcrypt
```

- [ ] **Step 4: Run seed against a fresh DB**

Run:

```bash
pnpm db:reset
pnpm db:seed
```

Expected: output includes `✓ seeded dev user and sample listings`. No errors.

- [ ] **Step 5: Verify data in the DB**

Run:

```bash
pnpm --filter=@kgm/api exec prisma studio
```

Alternatively, a quick check:

```bash
docker exec -i $(docker ps -qf "name=postgres") psql -U kgm -d kgm_dev -c "SELECT email FROM \"User\";"
docker exec -i $(docker ps -qf "name=postgres") psql -U kgm -d kgm_dev -c "SELECT title, status FROM \"Listing\";"
```

Expected: `dev@kgm.local` present; three ACTIVE listings present.

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/seed.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat(api): seed dev user and three sample listings"
```

---

## Task 5: lib/api.ts — apiFetch with ApiError

**Files:**
- Modify: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/lib/api.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/lib/api.spec.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch } from './api'

const mockCookiesGet = vi.fn<(name: string) => { value: string } | undefined>()

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: mockCookiesGet }),
}))

describe('apiFetch', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    mockCookiesGet.mockReset()
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })
  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('attaches Authorization from kgm_access cookie', async () => {
    mockCookiesGet.mockImplementation((name) => (name === 'kgm_access' ? { value: 'abc' } : undefined))
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }))
    await apiFetch('/categories')
    const init = fetchSpy.mock.calls[0][1] as RequestInit
    const headers = new Headers(init.headers)
    expect(headers.get('authorization')).toBe('Bearer abc')
  })

  it('omits Authorization when cookie absent', async () => {
    mockCookiesGet.mockReturnValue(undefined)
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ data: {} }), { status: 200 }))
    await apiFetch('/categories')
    const init = fetchSpy.mock.calls[0][1] as RequestInit
    const headers = new Headers(init.headers)
    expect(headers.get('authorization')).toBeNull()
  })

  it('throws ApiError with code, message, status on non-2xx', async () => {
    mockCookiesGet.mockReturnValue(undefined)
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'gone' } }), { status: 404 }),
    )
    await expect(apiFetch('/x')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'NOT_FOUND',
      message: 'gone',
      status: 404,
    })
    await expect(apiFetch('/x')).rejects.toBeInstanceOf(ApiError)
  })

  it('returns parsed json on success', async () => {
    mockCookiesGet.mockReturnValue(undefined)
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ data: { hello: 'world' } }), { status: 200 }))
    const result = await apiFetch<{ data: { hello: string } }>('/x')
    expect(result.data.hello).toBe('world')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter=@kgm/web test src/lib/api.spec.ts
```

Expected: FAIL — `ApiError` not exported, cookie logic not implemented.

- [ ] **Step 3: Implement**

Replace contents of `apps/web/src/lib/api.ts`:

```ts
import 'server-only'
import { cookies } from 'next/headers'

const INTERNAL_API_BASE = process.env.API_INTERNAL_URL ?? 'http://localhost:3001/api/v1'

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: unknown
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

/**
 * Server-side fetch against the API. Pulls kgm_access from cookies and attaches Bearer.
 *
 * List endpoints return a double envelope: { data: { data: [...], nextCursor } }.
 * Callers read .data.data for the array. Do not unwrap here.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${INTERNAL_API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers(init?.headers)
  const store = await cookies()
  const token = store.get('kgm_access')?.value
  if (token) headers.set('authorization', `Bearer ${token}`)
  if (!headers.has('content-type') && init?.body && typeof init.body === 'string') {
    headers.set('content-type', 'application/json')
  }
  const res = await fetch(url, { cache: 'no-store', ...init, headers })
  if (!res.ok) {
    let code = 'INTERNAL_ERROR'
    let message = `API ${res.status} for ${path}`
    let details: unknown
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string; details?: unknown } }
      code = body.error?.code ?? code
      message = body.error?.message ?? message
      details = body.error?.details
    } catch {
      // non-JSON body; keep defaults
    }
    throw new ApiError(code, message, res.status, details)
  }
  return (await res.json()) as T
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter=@kgm/web test src/lib/api.spec.ts
```

Expected: PASS. 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/lib/api.spec.ts
git commit -m "feat(web): apiFetch attaches cookie auth and throws ApiError"
```

---

## Task 6: lib/session.ts — cookie helpers

**Files:**
- Create: `apps/web/src/lib/session.ts`
- Create: `apps/web/src/lib/session.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/lib/session.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildSetCookieHeaders, CLEAR_COOKIE_HEADERS, COOKIE_NAMES } from './session'

describe('session cookie helpers', () => {
  it('builds Set-Cookie headers with httpOnly and SameSite=Lax', () => {
    const [access, refresh] = buildSetCookieHeaders({ accessToken: 'AAA', refreshToken: 'RRR', secure: false })
    expect(access).toContain('kgm_access=AAA')
    expect(access).toContain('HttpOnly')
    expect(access).toContain('SameSite=Lax')
    expect(access).toContain('Path=/')
    expect(access).toContain('Max-Age=900') // 15 min
    expect(refresh).toContain('kgm_refresh=RRR')
    expect(refresh).toContain('Max-Age=2592000') // 30 days
  })
  it('adds Secure when secure=true', () => {
    const [access] = buildSetCookieHeaders({ accessToken: 'A', refreshToken: 'R', secure: true })
    expect(access).toContain('Secure')
  })
  it('omits Secure when secure=false', () => {
    const [access] = buildSetCookieHeaders({ accessToken: 'A', refreshToken: 'R', secure: false })
    expect(access).not.toContain('Secure')
  })
  it('CLEAR_COOKIE_HEADERS expires both cookies', () => {
    for (const h of CLEAR_COOKIE_HEADERS) {
      expect(h).toContain('Max-Age=0')
    }
    expect(COOKIE_NAMES).toEqual(['kgm_access', 'kgm_refresh'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter=@kgm/web test src/lib/session.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/web/src/lib/session.ts`:

```ts
export const COOKIE_NAMES = ['kgm_access', 'kgm_refresh'] as const
const ACCESS_MAX_AGE = 15 * 60 // 15 minutes
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60 // 30 days

function buildCookie(name: string, value: string, maxAge: number, secure: boolean): string {
  const parts = [`${name}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function buildSetCookieHeaders(opts: {
  accessToken: string
  refreshToken: string
  secure: boolean
}): [string, string] {
  return [
    buildCookie('kgm_access', opts.accessToken, ACCESS_MAX_AGE, opts.secure),
    buildCookie('kgm_refresh', opts.refreshToken, REFRESH_MAX_AGE, opts.secure),
  ]
}

export const CLEAR_COOKIE_HEADERS: [string, string] = [
  'kgm_access=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
  'kgm_refresh=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
]
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter=@kgm/web test src/lib/session.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/session.ts apps/web/src/lib/session.spec.ts
git commit -m "feat(web): session cookie header helpers"
```

---

## Task 7: lib/auth-guard.ts — requireAuth for Server Components

**Files:**
- Create: `apps/web/src/lib/auth-guard.ts`
- Create: `apps/web/src/lib/auth-guard.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/lib/auth-guard.spec.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockCookiesGet = vi.fn<(name: string) => { value: string } | undefined>()
const mockRedirect = vi.fn<(url: string) => never>()

vi.mock('next/headers', () => ({ cookies: async () => ({ get: mockCookiesGet }) }))
vi.mock('next/navigation', () => ({ redirect: (u: string) => mockRedirect(u) }))

describe('requireAuth', () => {
  beforeEach(() => {
    mockCookiesGet.mockReset()
    mockRedirect.mockReset()
    mockRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT')
    })
  })
  afterEach(() => vi.resetModules())

  it('returns silently when kgm_access present', async () => {
    mockCookiesGet.mockImplementation((n) => (n === 'kgm_access' ? { value: 't' } : undefined))
    const { requireAuth } = await import('./auth-guard')
    await expect(requireAuth()).resolves.toBeUndefined()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('redirects to / when kgm_access missing', async () => {
    mockCookiesGet.mockReturnValue(undefined)
    const { requireAuth } = await import('./auth-guard')
    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter=@kgm/web test src/lib/auth-guard.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/web/src/lib/auth-guard.ts`:

```ts
import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function requireAuth(): Promise<void> {
  const store = await cookies()
  const token = store.get('kgm_access')?.value
  if (!token) {
    redirect('/')
  }
}

export async function isAuthed(): Promise<boolean> {
  const store = await cookies()
  return Boolean(store.get('kgm_access')?.value)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter=@kgm/web test src/lib/auth-guard.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/auth-guard.ts apps/web/src/lib/auth-guard.spec.ts
git commit -m "feat(web): requireAuth server-component guard"
```

---

## Task 8: lib/listing-transitions.ts — mirror API transitions

**Files:**
- Create: `apps/web/src/lib/listing-transitions.ts`
- Create: `apps/web/src/lib/listing-transitions.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/lib/listing-transitions.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { allowedNextStatuses, type ListingStatus } from './listing-transitions'

describe('allowedNextStatuses', () => {
  it('DRAFT → [ACTIVE]', () => {
    expect(allowedNextStatuses('DRAFT')).toEqual(['ACTIVE'])
  })
  it('ACTIVE → [DRAFT, PAUSED, SOLD]', () => {
    expect(allowedNextStatuses('ACTIVE')).toEqual(['DRAFT', 'PAUSED', 'SOLD'])
  })
  it('PAUSED → [ACTIVE]', () => {
    expect(allowedNextStatuses('PAUSED')).toEqual(['ACTIVE'])
  })
  it('SOLD/REJECTED/EXPIRED are terminal', () => {
    const terminal: ListingStatus[] = ['SOLD', 'REJECTED', 'EXPIRED']
    for (const s of terminal) {
      expect(allowedNextStatuses(s)).toEqual([])
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter=@kgm/web test src/lib/listing-transitions.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/web/src/lib/listing-transitions.ts`:

```ts
// MUST MATCH apps/api/src/listings/listings.service.ts ALLOWED_TRANSITIONS.
// API is the source of truth on enforcement; this constant only drives the UI dropdown.
export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'SOLD' | 'REJECTED' | 'EXPIRED'

const ALLOWED: Record<ListingStatus, ListingStatus[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['DRAFT', 'PAUSED', 'SOLD'],
  PAUSED: ['ACTIVE'],
  SOLD: [],
  REJECTED: [],
  EXPIRED: [],
}

export function allowedNextStatuses(current: ListingStatus): ListingStatus[] {
  return ALLOWED[current]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter=@kgm/web test src/lib/listing-transitions.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/listing-transitions.ts apps/web/src/lib/listing-transitions.spec.ts
git commit -m "feat(web): mirror listing status transitions for UI dropdown"
```

---

## Task 9: POST/DELETE /api/web/session route handlers

**Files:**
- Create: `apps/web/src/app/api/web/session/route.ts`
- Create: `apps/web/src/app/api/web/session/route.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/app/api/web/session/route.spec.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const originalFetch = globalThis.fetch
const originalEnv = { ...process.env }

describe('/api/web/session', () => {
  beforeEach(() => {
    process.env.API_INTERNAL_URL = 'http://api.test/api/v1'
    process.env.DEV_USER_EMAIL = 'dev@kgm.local'
    process.env.DEV_USER_PASSWORD = 'devpass123'
    process.env.NODE_ENV = 'development'
  })
  afterEach(() => {
    globalThis.fetch = originalFetch
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  it('POST logs in and sets both cookies', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ data: { tokens: { accessToken: 'A', refreshToken: 'R' }, user: { id: 'u1' } } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    ) as typeof fetch
    const { POST } = await import('./route')
    const res = await POST()
    expect(res.status).toBe(204)
    const cookies = res.headers.getSetCookie()
    expect(cookies.some((c) => c.includes('kgm_access=A'))).toBe(true)
    expect(cookies.some((c) => c.includes('kgm_refresh=R'))).toBe(true)
  })

  it('POST surfaces API error when login fails', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'bad' } }), { status: 401 }),
    ) as typeof fetch
    const { POST } = await import('./route')
    const res = await POST()
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('DELETE clears both cookies and calls logout', async () => {
    const logoutCalls: string[] = []
    globalThis.fetch = vi.fn(async (url) => {
      logoutCalls.push(String(url))
      return new Response('', { status: 204 })
    }) as typeof fetch
    const { DELETE } = await import('./route')
    const req = new Request('http://test/api/web/session', {
      method: 'DELETE',
      headers: { cookie: 'kgm_refresh=RR; kgm_access=AA' },
    })
    const res = await DELETE(req)
    expect(res.status).toBe(204)
    const cookies = res.headers.getSetCookie()
    expect(cookies.some((c) => c.includes('kgm_access=') && c.includes('Max-Age=0'))).toBe(true)
    expect(cookies.some((c) => c.includes('kgm_refresh=') && c.includes('Max-Age=0'))).toBe(true)
    expect(logoutCalls[0]).toContain('/auth/logout')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter=@kgm/web test src/app/api/web/session/route.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/web/src/app/api/web/session/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { buildSetCookieHeaders, CLEAR_COOKIE_HEADERS } from '@/lib/session'

const API_INTERNAL = process.env.API_INTERNAL_URL ?? 'http://localhost:3001/api/v1'
const DEV_EMAIL = process.env.DEV_USER_EMAIL ?? 'dev@kgm.local'
const DEV_PASSWORD = process.env.DEV_USER_PASSWORD ?? 'devpass123'

type AuthPayload = { data: { tokens: { accessToken: string; refreshToken: string } } }

export async function POST(): Promise<NextResponse> {
  const apiRes = await fetch(`${API_INTERNAL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD }),
    cache: 'no-store',
  })
  if (!apiRes.ok) {
    const errBody = await apiRes.arrayBuffer()
    return new NextResponse(errBody, {
      status: apiRes.status,
      headers: { 'content-type': apiRes.headers.get('content-type') ?? 'application/json' },
    })
  }
  const body = (await apiRes.json()) as AuthPayload
  const secure = process.env.NODE_ENV === 'production'
  const [access, refresh] = buildSetCookieHeaders({
    accessToken: body.data.tokens.accessToken,
    refreshToken: body.data.tokens.refreshToken,
    secure,
  })
  const res = new NextResponse(null, { status: 204 })
  res.headers.append('set-cookie', access)
  res.headers.append('set-cookie', refresh)
  return res
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const refreshToken = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('kgm_refresh='))
    ?.slice('kgm_refresh='.length)

  if (refreshToken) {
    try {
      await fetch(`${API_INTERNAL}/auth/logout`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      })
    } catch {
      // swallow — logout is best-effort
    }
  }
  const res = new NextResponse(null, { status: 204 })
  for (const h of CLEAR_COOKIE_HEADERS) res.headers.append('set-cookie', h)
  return res
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter=@kgm/web test src/app/api/web/session/route.spec.ts
```

Expected: PASS. All three tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/web/session
git commit -m "feat(web): POST/DELETE /api/web/session for dev-login and logout"
```

---

## Task 10: Update env.example with new vars

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Append dev-user and locale defaults**

Append to `.env.example`:

```
# ── Web dev-login (Phase 1d) ──────────────────────────────────────────────────
DEV_USER_EMAIL="dev@kgm.local"
DEV_USER_PASSWORD="devpass123"
NEXT_PUBLIC_DEFAULT_LOCALE="ru"
```

- [ ] **Step 2: Verify local .env has the new keys**

Check `.env` and add the same keys if missing. Do not commit `.env`.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore(env): document dev-login and default-locale vars"
```

---

## Task 11: next-intl scaffold — middleware, locale segment, catalogs

**Files:**
- Create: `apps/web/messages/ru.json`
- Create: `apps/web/messages/ky.json`
- Create: `apps/web/messages/ky.README.md`
- Create: `apps/web/src/middleware.ts`
- Create: `apps/web/src/lib/i18n.ts`
- Create: `apps/web/src/app/[locale]/layout.tsx`
- Create: `apps/web/src/app/[locale]/page.tsx` (placeholder until Task 16)
- Delete: `apps/web/src/app/layout.tsx`
- Delete: `apps/web/src/app/page.tsx`
- Modify: `apps/web/next.config.ts`

- [ ] **Step 1: Write ru catalog**

Create `apps/web/messages/ru.json`:

```json
{
  "common": {
    "loading": "Загрузка…",
    "error": "Произошла ошибка",
    "back": "Назад",
    "save": "Сохранить",
    "cancel": "Отмена",
    "delete": "Удалить",
    "edit": "Редактировать",
    "publish": "Опубликовать",
    "loadMore": "Показать ещё",
    "kgs": "сом",
    "seller": "Продавец",
    "contactSeller": "Связаться с продавцом",
    "comingSoon": "Скоро",
    "locale": {
      "ru": "Русский",
      "ky": "Кыргызча"
    },
    "condition": {
      "NEW": "Новый",
      "USED": "Б/у",
      "REFURBISHED": "Восстановленный"
    },
    "status": {
      "DRAFT": "Черновик",
      "ACTIVE": "Активно",
      "PAUSED": "На паузе",
      "SOLD": "Продано",
      "REJECTED": "Отклонено",
      "EXPIRED": "Истекло"
    }
  },
  "home": {
    "heroTitle": "KG Marketplace",
    "heroSubtitle": "Покупайте и продавайте в Кыргызстане",
    "sellCta": "Продать что-то",
    "browseCta": "Смотреть все",
    "featured": "Популярные объявления"
  },
  "listings": {
    "browseTitle": "Все объявления",
    "filterByCategory": "Категория",
    "allCategories": "Все категории",
    "clearFilter": "Сбросить фильтр",
    "empty": "Здесь пока ничего нет. Будьте первым.",
    "emptyFiltered": "Ничего не найдено в этой категории.",
    "views": "Просмотров: {count}",
    "postedOn": "Опубликовано {date}"
  },
  "sell": {
    "newTitle": "Создать объявление",
    "imagesTitle": "Добавить фотографии",
    "imagesHint": "До 10 изображений, JPEG/PNG/WebP, макс. 5 МБ каждое",
    "imagesRemaining": "Осталось слотов: {count}",
    "noImagesWarning": "Добавьте хотя бы одно изображение перед публикацией.",
    "saveForLater": "Сохранить в черновики",
    "fields": {
      "title": "Заголовок",
      "description": "Описание",
      "price": "Цена (сом)",
      "condition": "Состояние",
      "category": "Категория",
      "subcategory": "Подкатегория",
      "location": "Город / населённый пункт"
    }
  },
  "dashboard": {
    "title": "Мои объявления",
    "stats": {
      "active": "Активных",
      "draft": "Черновиков",
      "sold": "Продано",
      "paused": "На паузе",
      "totalViews": "Всего просмотров"
    },
    "table": {
      "title": "Название",
      "status": "Статус",
      "price": "Цена",
      "views": "Просмотры",
      "created": "Создано",
      "actions": "Действия"
    },
    "empty": "Вы пока ничего не разместили.",
    "createCta": "Создать первое объявление",
    "deleteConfirmTitle": "Удалить объявление?",
    "deleteConfirmBody": "Это действие нельзя отменить."
  },
  "auth": {
    "devLogin": "Войти (dev)",
    "logout": "Выйти",
    "dashboard": "Кабинет"
  },
  "errors": {
    "generic": "Что-то пошло не так",
    "unauthorized": "Требуется вход",
    "notFound": "Объявление не найдено",
    "imageLimit": "Максимум 10 изображений на объявление",
    "imageType": "Допустимы только JPEG, PNG, WebP",
    "imageSize": "Файл превышает 5 МБ",
    "invalidTransition": "Нельзя перевести {from} → {to}",
    "required": "Обязательное поле",
    "titleLength": "3–200 символов",
    "descriptionLength": "10–5000 символов",
    "pricePositive": "Положительное число, до 2 знаков после точки"
  }
}
```

- [ ] **Step 2: Write ky catalog (stubbed with ru values)**

Create `apps/web/messages/ky.json` — copy the ru file verbatim:

```bash
cp apps/web/messages/ru.json apps/web/messages/ky.json
```

Create `apps/web/messages/ky.README.md`:

```markdown
# Kyrgyz catalog (stub)

This file currently contains Russian values as placeholders. Translate to Kyrgyz in Phase 2 when professional translation is available. The key structure must stay in sync with `ru.json`.
```

- [ ] **Step 3: Write i18n config**

Create `apps/web/src/lib/i18n.ts`:

```ts
import { getRequestConfig } from 'next-intl/server'
import { notFound } from 'next/navigation'

export const locales = ['ru', 'ky'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'ru'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  if (!requested || !locales.includes(requested as Locale)) notFound()
  return {
    locale: requested as Locale,
    messages: (await import(`../../messages/${requested}.json`)).default,
  }
})
```

- [ ] **Step 4: Write middleware**

Create `apps/web/src/middleware.ts`:

```ts
import createMiddleware from 'next-intl/middleware'
import { defaultLocale, locales } from '@/lib/i18n'

export default createMiddleware({
  locales: Array.from(locales),
  defaultLocale,
  localePrefix: 'always',
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

- [ ] **Step 5: Update next.config.ts to wire next-intl plugin**

Read current `apps/web/next.config.ts` and replace with:

```ts
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/lib/i18n.ts')

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '9000' },
    ],
  },
}

export default withNextIntl(nextConfig)
```

- [ ] **Step 6: Move layout and page under [locale]**

Delete old files:

```bash
rm apps/web/src/app/layout.tsx apps/web/src/app/page.tsx
```

Create `apps/web/src/app/[locale]/layout.tsx`:

```tsx
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Toaster } from '@/components/ui/toaster'
import { locales, type Locale } from '@/lib/i18n'
import '../globals.css'

export const metadata = {
  title: 'KG Marketplace',
  description: 'Унифицированная торговая площадка Кыргызстана',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!locales.includes(locale as Locale)) notFound()
  const messages = await getMessages()
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

Create placeholder `apps/web/src/app/[locale]/page.tsx` (replaced in Task 16):

```tsx
import { useTranslations } from 'next-intl'

export default function HomePage() {
  const t = useTranslations('home')
  return (
    <main className="container py-12">
      <h1 className="text-3xl font-semibold">{t('heroTitle')}</h1>
      <p className="mt-2 text-muted-foreground">{t('heroSubtitle')}</p>
    </main>
  )
}
```

- [ ] **Step 7: Run dev server and smoke-check**

Ensure Postgres/Redis/MinIO are up (`docker compose up -d`). Then in one terminal:

```bash
pnpm -r build
pnpm --filter=@kgm/api dev
```

In another:

```bash
pnpm --filter=@kgm/web dev
```

Open `http://localhost:3000/` in a browser — should redirect to `http://localhost:3000/ru` and render "KG Marketplace".

Open `http://localhost:3000/ky` — same text (ky catalog is stubbed with ru).

- [ ] **Step 8: Type-check and build**

Run:

```bash
pnpm --filter=@kgm/web type-check
pnpm --filter=@kgm/web build
```

Expected: both pass.

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat(web): next-intl scaffold with ru populated, ky stubbed"
```

---

## Task 12: Site header, footer, locale switcher

**Files:**
- Create: `apps/web/src/components/layout/site-header.tsx`
- Create: `apps/web/src/components/layout/site-footer.tsx`
- Create: `apps/web/src/components/layout/locale-switch.tsx`
- Modify: `apps/web/src/app/[locale]/layout.tsx`

- [ ] **Step 1: Create LocaleSwitch (client)**

Create `apps/web/src/components/layout/locale-switch.tsx`:

```tsx
'use client'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { locales } from '@/lib/i18n'

export function LocaleSwitch() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  function onChange(next: string) {
    const segments = pathname.split('/')
    segments[1] = next
    router.push(segments.join('/') || '/')
  }

  return (
    <Select value={locale} onValueChange={onChange}>
      <SelectTrigger className="w-[120px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {locales.map((l) => (
          <SelectItem key={l} value={l}>
            {l === 'ru' ? 'Русский' : 'Кыргызча'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

- [ ] **Step 2: Create SiteHeader (server component with auth state)**

Create `apps/web/src/components/layout/site-header.tsx`:

```tsx
import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { isAuthed } from '@/lib/auth-guard'
import { LocaleSwitch } from './locale-switch'
import { DevLoginButton } from '@/components/auth/dev-login-button'
import { LogoutButton } from '@/components/auth/logout-button'

export async function SiteHeader() {
  const locale = await getLocale()
  const t = await getTranslations('auth')
  const authed = await isAuthed()
  return (
    <header className="border-b">
      <div className="container flex h-14 items-center justify-between">
        <Link href={`/${locale}`} className="text-lg font-semibold">
          KG Marketplace
        </Link>
        <nav className="flex items-center gap-3">
          <Link href={`/${locale}/listings`} className="text-sm hover:underline">
            {locale === 'ky' ? 'Жарыялар' : 'Объявления'}
          </Link>
          <Link href={`/${locale}/sell/new`} className="text-sm hover:underline">
            {locale === 'ky' ? 'Сатуу' : 'Продать'}
          </Link>
          <LocaleSwitch />
          {authed ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/${locale}/dashboard`}>{t('dashboard')}</Link>
              </Button>
              <LogoutButton />
            </>
          ) : (
            <DevLoginButton />
          )}
        </nav>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Create SiteFooter**

Create `apps/web/src/components/layout/site-footer.tsx`:

```tsx
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t">
      <div className="container py-6 text-sm text-muted-foreground">
        © {new Date().getFullYear()} KG Marketplace
      </div>
    </footer>
  )
}
```

- [ ] **Step 4: Wire header + footer into layout**

Replace contents of `apps/web/src/app/[locale]/layout.tsx`:

```tsx
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Toaster } from '@/components/ui/toaster'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { locales, type Locale } from '@/lib/i18n'
import '../globals.css'

export const metadata = {
  title: 'KG Marketplace',
  description: 'Унифицированная торговая площадка Кыргызстана',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!locales.includes(locale as Locale)) notFound()
  const messages = await getMessages()
  return (
    <html lang={locale}>
      <body className="min-h-screen flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

Note: this references `DevLoginButton` and `LogoutButton` which are created in Task 13. Build will fail until then — that's expected; Task 13 lands them and re-verifies.

- [ ] **Step 5: Commit (WIP — header depends on Task 13)**

```bash
git add apps/web/src/components/layout apps/web/src/app/[locale]/layout.tsx
git commit -m "feat(web): site header, footer, locale switcher (header auth buttons stubbed)"
```

---

## Task 13: Dev-login and logout buttons

**Files:**
- Create: `apps/web/src/components/auth/dev-login-button.tsx`
- Create: `apps/web/src/components/auth/dev-login-button.spec.tsx`
- Create: `apps/web/src/components/auth/logout-button.tsx`

- [ ] **Step 1: Write failing test for dev-login button**

Create `apps/web/src/components/auth/dev-login-button.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DevLoginButton } from './dev-login-button'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}))

const messages = {
  auth: { devLogin: 'Dev login', logout: 'Logout', dashboard: 'Dashboard' },
  errors: { generic: 'Error' },
}

function renderIt() {
  return render(
    <NextIntlClientProvider locale="ru" messages={messages}>
      <DevLoginButton />
    </NextIntlClientProvider>,
  )
}

describe('DevLoginButton', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    mockPush.mockReset()
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })
  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('POSTs to /api/web/session and refreshes on success', async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 204 }))
    renderIt()
    await userEvent.click(screen.getByRole('button', { name: 'Dev login' }))
    expect(fetchSpy).toHaveBeenCalledWith('/api/web/session', expect.objectContaining({ method: 'POST' }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter=@kgm/web test src/components/auth/dev-login-button.spec.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement DevLoginButton**

Create `apps/web/src/components/auth/dev-login-button.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export function DevLoginButton() {
  const t = useTranslations('auth')
  const tErr = useTranslations('errors')
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function onClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/web/session', { method: 'POST' })
      if (!res.ok) {
        toast({ variant: 'destructive', title: tErr('generic') })
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" onClick={onClick} disabled={loading}>
      {t('devLogin')}
    </Button>
  )
}
```

- [ ] **Step 4: Implement LogoutButton**

Create `apps/web/src/components/auth/logout-button.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function onClick() {
    setLoading(true)
    try {
      await fetch('/api/web/session', { method: 'DELETE' })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" variant="ghost" onClick={onClick} disabled={loading}>
      {t('logout')}
    </Button>
  )
}
```

- [ ] **Step 5: Run tests and build**

```bash
pnpm --filter=@kgm/web test
pnpm --filter=@kgm/web build
```

Expected: all tests pass; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/auth
git commit -m "feat(web): dev-login and logout buttons with toast feedback"
```

---

## Task 14: apiFetchClient helper (client-side proxy fetch)

**Files:**
- Modify: `apps/web/src/lib/api.ts` (extend) — but since `apiFetch` uses `server-only`, we create a sibling module.
- Create: `apps/web/src/lib/api-client.ts`
- Create: `apps/web/src/lib/api-client.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/lib/api-client.spec.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api-client'
import { apiFetchClient } from './api-client'

describe('apiFetchClient', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })
  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('rewrites /listings to /api/proxy/listings', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }))
    await apiFetchClient('/listings')
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/proxy/listings')
  })

  it('throws ApiError with parsed envelope on non-2xx', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'no' } }), { status: 403 }),
    )
    await expect(apiFetchClient('/x')).rejects.toBeInstanceOf(ApiError)
    await expect(apiFetchClient('/x')).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter=@kgm/web test src/lib/api-client.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/web/src/lib/api-client.ts`:

```ts
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: unknown
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

/**
 * Client-side fetch that goes through the Next proxy route handler, which
 * forwards the kgm_access cookie as Authorization. Use from Client Components.
 * Path is relative to /api/v1 on the API — "/listings" → "/api/proxy/listings".
 */
export async function apiFetchClient<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `/api/proxy${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, { cache: 'no-store', ...init })
  if (!res.ok) {
    let code = 'INTERNAL_ERROR'
    let message = `Request failed: ${res.status}`
    let details: unknown
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string; details?: unknown } }
      code = body.error?.code ?? code
      message = body.error?.message ?? message
      details = body.error?.details
    } catch {
      // non-JSON
    }
    throw new ApiError(code, message, res.status, details)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter=@kgm/web test src/lib/api-client.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/api-client.ts apps/web/src/lib/api-client.spec.ts
git commit -m "feat(web): apiFetchClient for client-side calls through /api/proxy"
```

---

## Task 15: ListingCard and Price components

**Files:**
- Create: `apps/web/src/components/common/price.tsx`
- Create: `apps/web/src/components/listings/listing-card.tsx`
- Create: `apps/web/src/components/listings/listing-card.spec.tsx`

- [ ] **Step 1: Write Price component**

Create `apps/web/src/components/common/price.tsx`:

```tsx
import { formatKgs } from '@kgm/utils'

export function Price({ value }: { value: string }) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return <span>{value}</span>
  return <span className="font-semibold">{formatKgs(numeric)}</span>
}
```

- [ ] **Step 2: Write failing card test**

Create `apps/web/src/components/listings/listing-card.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'
import type { PublicListing } from '@kgm/types'
import { ListingCard } from './listing-card'

const messages = { common: { kgs: 'сом', condition: { USED: 'Б/у', NEW: 'Новый', REFURBISHED: 'Восстановленный' } } }

const baseListing: PublicListing = {
  id: 'L1',
  title: 'Test item',
  description: 'd',
  price: '1000',
  currency: 'KGS',
  condition: 'USED',
  status: 'ACTIVE',
  location: 'Bishkek',
  viewCount: 5,
  sellerId: 'S',
  categoryId: 'C',
  images: [{ id: 'i1', url: 'http://localhost:9000/kgm-media/x.jpg', sortOrder: 0 }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('ListingCard', () => {
  it('renders title, price, and first image', () => {
    render(
      <NextIntlClientProvider locale="ru" messages={messages}>
        <ListingCard listing={baseListing} locale="ru" />
      </NextIntlClientProvider>,
    )
    expect(screen.getByText('Test item')).toBeInTheDocument()
    expect(screen.getByAltText('Test item')).toBeInTheDocument()
  })

  it('renders a placeholder when no images', () => {
    render(
      <NextIntlClientProvider locale="ru" messages={messages}>
        <ListingCard listing={{ ...baseListing, images: [] }} locale="ru" />
      </NextIntlClientProvider>,
    )
    expect(screen.getByTestId('listing-card-placeholder')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
pnpm --filter=@kgm/web test src/components/listings/listing-card.spec.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement ListingCard**

Create `apps/web/src/components/listings/listing-card.tsx`:

```tsx
import Image from 'next/image'
import Link from 'next/link'
import type { PublicListing } from '@kgm/types'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Price } from '@/components/common/price'

export function ListingCard({ listing, locale }: { listing: PublicListing; locale: string }) {
  const first = listing.images[0]
  return (
    <Link href={`/${locale}/listings/${listing.id}`} className="block">
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-[4/3] bg-muted">
          {first ? (
            <Image
              src={first.url}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div data-testid="listing-card-placeholder" className="flex h-full items-center justify-center text-muted-foreground text-sm">
              —
            </div>
          )}
        </div>
        <div className="p-4 space-y-1">
          <div className="line-clamp-2 text-sm font-medium">{listing.title}</div>
          <div className="flex items-center justify-between">
            <Price value={listing.price} />
            <Badge variant="secondary">{listing.location ?? '—'}</Badge>
          </div>
        </div>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
pnpm --filter=@kgm/web test src/components/listings/listing-card.spec.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/common/price.tsx apps/web/src/components/listings
git commit -m "feat(web): ListingCard with Price formatter and image placeholder"
```

---

## Task 16: Home page with featured grid

**Files:**
- Modify: `apps/web/src/app/[locale]/page.tsx`

- [ ] **Step 1: Implement home page**

Replace contents of `apps/web/src/app/[locale]/page.tsx`:

```tsx
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { PublicListing } from '@kgm/types'
import { Button } from '@/components/ui/button'
import { ListingCard } from '@/components/listings/listing-card'
import { apiFetch } from '@/lib/api'

type ListingsResponse = { data: { data: PublicListing[]; nextCursor: string | null } }

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations('home')
  let featured: PublicListing[] = []
  try {
    const res = await apiFetch<ListingsResponse>('/listings?limit=8')
    featured = res.data.data
  } catch {
    featured = []
  }
  return (
    <main className="container py-12 space-y-12">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">{t('heroTitle')}</h1>
        <p className="text-lg text-muted-foreground">{t('heroSubtitle')}</p>
        <div className="flex justify-center gap-3">
          <Button asChild size="lg">
            <Link href={`/${locale}/sell/new`}>{t('sellCta')}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/${locale}/listings`}>{t('browseCta')}</Link>
          </Button>
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-4">{t('featured')}</h2>
        {featured.length === 0 ? (
          <p className="text-muted-foreground text-sm">—</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((l) => (
              <ListingCard key={l.id} listing={l} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Smoke-check in browser**

Start API + web (see Task 11 Step 7). Open `http://localhost:3000/ru` — expect hero, 2 CTAs, and up to 3 seeded listings in the featured grid.

- [ ] **Step 3: Build**

```bash
pnpm --filter=@kgm/web build
```

Expected: build passes.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/[locale]/page.tsx
git commit -m "feat(web): home page with hero, CTAs, and featured listings grid"
```

---

## Task 17: Browse page — /listings with filter and load-more

**Files:**
- Create: `apps/web/src/components/listings/listings-grid.tsx`
- Create: `apps/web/src/components/listings/listing-filters.tsx`
- Create: `apps/web/src/app/[locale]/listings/page.tsx`
- Create: `apps/web/src/app/[locale]/listings/loading.tsx`

- [ ] **Step 1: Fetch categories utility on the server**

Create a tiny helper inline in the page (no separate file) — we'll use `apiFetch` directly.

- [ ] **Step 2: Create ListingFilters (client)**

Create `apps/web/src/components/listings/listing-filters.tsx`:

```tsx
'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import type { CategoryNode } from '@kgm/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

function flatten(tree: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = []
  function walk(nodes: CategoryNode[]) {
    for (const n of nodes) {
      if (!n.children || n.children.length === 0) out.push(n)
      else walk(n.children)
    }
  }
  walk(tree)
  return out
}

export function ListingFilters({ tree }: { tree: CategoryNode[] }) {
  const t = useTranslations('listings')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const current = params.get('categoryId') ?? ''
  const leaves = flatten(tree)

  function onSelect(value: string) {
    const next = new URLSearchParams(params.toString())
    if (value === '__all__') next.delete('categoryId')
    else next.set('categoryId', value)
    router.push(`${pathname}?${next.toString()}`)
  }

  function onClear() {
    router.push(pathname)
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={current || '__all__'} onValueChange={onSelect}>
        <SelectTrigger className="w-[260px]">
          <SelectValue placeholder={t('filterByCategory')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t('allCategories')}</SelectItem>
          {leaves.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {locale === 'ky' ? c.nameKy : c.nameRu}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {current && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          {t('clearFilter')}
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create ListingsGrid with client load-more**

Create `apps/web/src/components/listings/listings-grid.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { PublicListing } from '@kgm/types'
import { Button } from '@/components/ui/button'
import { ListingCard } from './listing-card'
import { apiFetchClient, ApiError } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

type Page = { data: { data: PublicListing[]; nextCursor: string | null } }

export function ListingsGrid({
  initialListings,
  initialCursor,
  categoryId,
}: {
  initialListings: PublicListing[]
  initialCursor: string | null
  categoryId?: string
}) {
  const t = useTranslations('common')
  const tL = useTranslations('listings')
  const locale = useLocale()
  const { toast } = useToast()
  const [listings, setListings] = useState(initialListings)
  const [cursor, setCursor] = useState(initialCursor)
  const [loading, setLoading] = useState(false)

  async function loadMore() {
    if (!cursor) return
    setLoading(true)
    try {
      const qs = new URLSearchParams({ limit: '20', cursor })
      if (categoryId) qs.set('categoryId', categoryId)
      const res = await apiFetchClient<Page>(`/listings?${qs.toString()}`)
      setListings((prev) => [...prev, ...res.data.data])
      setCursor(res.data.nextCursor)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'error'
      toast({ variant: 'destructive', title: msg })
    } finally {
      setLoading(false)
    }
  }

  if (listings.length === 0) {
    return <p className="text-muted-foreground text-sm">{categoryId ? tL('emptyFiltered') : tL('empty')}</p>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} locale={locale} />
        ))}
      </div>
      {cursor && (
        <div className="text-center">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? t('loading') : t('loadMore')}
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create browse page**

Create `apps/web/src/app/[locale]/listings/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import type { CategoryNode, PublicListing } from '@kgm/types'
import { ListingFilters } from '@/components/listings/listing-filters'
import { ListingsGrid } from '@/components/listings/listings-grid'
import { apiFetch } from '@/lib/api'

type ListingsResponse = { data: { data: PublicListing[]; nextCursor: string | null } }
type CategoriesResponse = { data: CategoryNode[] }

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string }>
}) {
  const sp = await searchParams
  const t = await getTranslations('listings')
  const qs = new URLSearchParams({ limit: '20' })
  if (sp.categoryId) qs.set('categoryId', sp.categoryId)
  const [listingsRes, categoriesRes] = await Promise.all([
    apiFetch<ListingsResponse>(`/listings?${qs.toString()}`),
    apiFetch<CategoriesResponse>('/categories'),
  ])
  return (
    <main className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('browseTitle')}</h1>
        <ListingFilters tree={categoriesRes.data} />
      </div>
      <ListingsGrid
        key={sp.categoryId ?? 'all'}
        initialListings={listingsRes.data.data}
        initialCursor={listingsRes.data.nextCursor}
        categoryId={sp.categoryId}
      />
    </main>
  )
}
```

- [ ] **Step 5: Create loading skeleton**

Create `apps/web/src/app/[locale]/listings/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <main className="container py-8">
      <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Smoke-check in browser**

Open `http://localhost:3000/ru/listings` — grid should render sample listings. Open the filter dropdown; pick "Телефоны" — URL updates to `?categoryId=...`, grid filters.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/listings apps/web/src/app/[locale]/listings
git commit -m "feat(web): browse page with category filter and client-side load-more"
```

---

## Task 18: Listing detail page

**Files:**
- Create: `apps/web/src/app/[locale]/listings/[id]/page.tsx`
- Create: `apps/web/src/app/[locale]/listings/[id]/loading.tsx`
- Create: `apps/web/src/components/listings/gallery-thumbs.tsx`

- [ ] **Step 1: Create GalleryThumbs (client)**

Create `apps/web/src/components/listings/gallery-thumbs.tsx`:

```tsx
'use client'
import Image from 'next/image'
import { useState } from 'react'
import type { PublicListingImage } from '@kgm/types'
import { cn } from '@/lib/utils'

export function GalleryThumbs({ images, title }: { images: PublicListingImage[]; title: string }) {
  const [active, setActive] = useState(0)
  if (images.length === 0) {
    return <div className="aspect-[4/3] bg-muted rounded-lg" />
  }
  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
        <Image src={images[active].url} alt={title} fill className="object-contain" unoptimized />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'relative h-16 w-16 flex-shrink-0 rounded border-2 overflow-hidden',
                i === active ? 'border-primary' : 'border-transparent',
              )}
            >
              <Image src={img.url} alt="" fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create detail page**

Create `apps/web/src/app/[locale]/listings/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { PublicListing } from '@kgm/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Price } from '@/components/common/price'
import { GalleryThumbs } from '@/components/listings/gallery-thumbs'
import { ApiError, apiFetch } from '@/lib/api'

type Response = { data: PublicListing }

export default async function DetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const t = await getTranslations('listings')
  const tC = await getTranslations('common')
  let listing: PublicListing
  try {
    const res = await apiFetch<Response>(`/listings/${id}`)
    listing = res.data
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }
  const createdFormatted = new Intl.DateTimeFormat(locale === 'ky' ? 'ky-KG' : 'ru-RU', {
    dateStyle: 'medium',
  }).format(new Date(listing.createdAt))
  return (
    <main className="container py-8 grid gap-8 md:grid-cols-2">
      <GalleryThumbs images={listing.images} title={listing.title} />
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">{listing.title}</h1>
        <div className="flex items-center gap-3">
          <Price value={listing.price} />
          <Badge variant="secondary">{tC(`condition.${listing.condition}`)}</Badge>
          {listing.location && <span className="text-sm text-muted-foreground">📍 {listing.location}</span>}
        </div>
        <p className="text-sm text-muted-foreground">
          {t('postedOn', { date: createdFormatted })} · {t('views', { count: listing.viewCount })}
        </p>
        <div className="prose max-w-none whitespace-pre-wrap">{listing.description}</div>
        <div className="pt-4 border-t space-y-2">
          <p className="text-sm">
            <span className="font-medium">{tC('seller')}:</span> —
          </p>
          <Button disabled title={tC('comingSoon')}>
            {tC('contactSeller')}
          </Button>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Create loading skeleton**

Create `apps/web/src/app/[locale]/listings/[id]/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <main className="container py-8 grid gap-8 md:grid-cols-2">
      <div className="aspect-[4/3] bg-muted rounded-lg animate-pulse" />
      <div className="space-y-3">
        <div className="h-8 w-3/4 bg-muted rounded animate-pulse" />
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        <div className="h-24 bg-muted rounded animate-pulse" />
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Smoke-check**

Open `/ru/listings` → click a sample listing → detail page loads with gallery, formatted price, condition badge, localized date.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/[locale]/listings/[id] apps/web/src/components/listings/gallery-thumbs.tsx
git commit -m "feat(web): listing detail page with gallery, localized date, seller stub"
```

---

## Task 19: ListingForm component

**Files:**
- Create: `apps/web/src/components/listings/listing-form.tsx`
- Create: `apps/web/src/components/listings/listing-form.spec.tsx`

This form is used by `/sell/new` (create) and `/dashboard/listings/[id]/edit` (edit). It validates with `CreateListingSchema` / `UpdateListingSchema` from `@kgm/types`.

- [ ] **Step 1: Write failing test**

Create `apps/web/src/components/listings/listing-form.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'
import type { CategoryNode } from '@kgm/types'
import { ListingForm } from './listing-form'

const messages = {
  common: { save: 'Save', cancel: 'Cancel', condition: { NEW: 'New', USED: 'Used', REFURBISHED: 'Refurbished' } },
  sell: {
    fields: { title: 'Title', description: 'Description', price: 'Price', condition: 'Condition', category: 'Category', subcategory: 'Subcategory', location: 'Location' },
  },
  errors: { required: 'Required', titleLength: '3-200', descriptionLength: '10-5000', pricePositive: 'positive' },
}

const categories: CategoryNode[] = [
  { id: 'root', slug: 'root', nameRu: 'R', nameKy: 'R', parentId: null, sortOrder: 0, children: [
    { id: 'leaf', slug: 'leaf', nameRu: 'Leaf', nameKy: 'Leaf', parentId: 'root', sortOrder: 0, children: [] },
  ] },
]

describe('ListingForm', () => {
  it('shows required errors on empty submit', async () => {
    const onSubmit = vi.fn()
    render(
      <NextIntlClientProvider locale="ru" messages={messages}>
        <ListingForm mode="create" categories={categories} onSubmit={onSubmit} />
      </NextIntlClientProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getAllByText(/Required|3-200|10-5000/i).length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter=@kgm/web test src/components/listings/listing-form.spec.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ListingForm**

Create `apps/web/src/components/listings/listing-form.tsx`:

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { z } from 'zod'
import type { CategoryNode, PublicListing } from '@kgm/types'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const schema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).refine((v) => Number(v) > 0),
  condition: z.enum(['NEW', 'USED', 'REFURBISHED']),
  rootCategoryId: z.string().min(1),
  categoryId: z.string().min(1),
  location: z.string().optional(),
})

export type ListingFormValues = z.infer<typeof schema>

export function ListingForm({
  mode,
  categories,
  initial,
  onSubmit,
  submitting,
}: {
  mode: 'create' | 'edit'
  categories: CategoryNode[]
  initial?: PublicListing
  onSubmit: (values: Omit<ListingFormValues, 'rootCategoryId'>) => void | Promise<void>
  submitting?: boolean
}) {
  const t = useTranslations('sell.fields')
  const tC = useTranslations('common')
  const tErr = useTranslations('errors')

  const initialRootId = useMemo(() => {
    if (!initial) return ''
    for (const root of categories) {
      if (root.children?.some((c) => c.id === initial.categoryId)) return root.id
    }
    return ''
  }, [categories, initial])

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      price: initial?.price ?? '',
      condition: initial?.condition ?? 'USED',
      rootCategoryId: initialRootId,
      categoryId: initial?.categoryId ?? '',
      location: initial?.location ?? '',
    },
  })

  const rootId = form.watch('rootCategoryId')
  const activeRoot = categories.find((c) => c.id === rootId)
  const leaves = activeRoot?.children ?? []

  async function handle(values: ListingFormValues) {
    const { rootCategoryId: _r, ...rest } = values
    await onSubmit(rest)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handle)} className="space-y-4 max-w-xl">
        <FormField name="title" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>{t('title')}</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage>{form.formState.errors.title ? tErr('titleLength') : undefined}</FormMessage>
          </FormItem>
        )} />
        <FormField name="description" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>{t('description')}</FormLabel>
            <FormControl><Textarea rows={6} {...field} /></FormControl>
            <FormMessage>{form.formState.errors.description ? tErr('descriptionLength') : undefined}</FormMessage>
          </FormItem>
        )} />
        <FormField name="price" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>{t('price')}</FormLabel>
            <FormControl><Input inputMode="decimal" {...field} /></FormControl>
            <FormMessage>{form.formState.errors.price ? tErr('pricePositive') : undefined}</FormMessage>
          </FormItem>
        )} />
        <FormField name="condition" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>{t('condition')}</FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">{tC('condition.NEW')}</SelectItem>
                  <SelectItem value="USED">{tC('condition.USED')}</SelectItem>
                  <SelectItem value="REFURBISHED">{tC('condition.REFURBISHED')}</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="rootCategoryId" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>{t('category')}</FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={(v) => { field.onChange(v); form.setValue('categoryId', '') }}>
                <SelectTrigger><SelectValue placeholder={t('category')} /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nameRu}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage>{form.formState.errors.rootCategoryId ? tErr('required') : undefined}</FormMessage>
          </FormItem>
        )} />
        <FormField name="categoryId" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>{t('subcategory')}</FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange} disabled={leaves.length === 0}>
                <SelectTrigger><SelectValue placeholder={t('subcategory')} /></SelectTrigger>
                <SelectContent>
                  {leaves.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nameRu}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage>{form.formState.errors.categoryId ? tErr('required') : undefined}</FormMessage>
          </FormItem>
        )} />
        <FormField name="location" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>{t('location')}</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" disabled={submitting}>
          {submitting ? tC('loading') : tC('save')}
        </Button>
      </form>
    </Form>
  )
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
pnpm --filter=@kgm/web test src/components/listings/listing-form.spec.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/listings/listing-form.tsx apps/web/src/components/listings/listing-form.spec.tsx
git commit -m "feat(web): ListingForm with cascading categories and zod validation"
```

---

## Task 20: /sell/new create page

**Files:**
- Create: `apps/web/src/app/[locale]/sell/new/page.tsx`
- Create: `apps/web/src/components/listings/create-listing-client.tsx`

- [ ] **Step 1: Create server page (guard + fetch categories)**

Create `apps/web/src/app/[locale]/sell/new/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import type { CategoryNode } from '@kgm/types'
import { apiFetch } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'
import { CreateListingClient } from '@/components/listings/create-listing-client'

type CategoriesResponse = { data: CategoryNode[] }

export default async function NewListingPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAuth()
  const { locale } = await params
  const t = await getTranslations('sell')
  const cats = await apiFetch<CategoriesResponse>('/categories')
  return (
    <main className="container py-8">
      <h1 className="text-2xl font-semibold mb-6">{t('newTitle')}</h1>
      <CreateListingClient categories={cats.data} locale={locale} />
    </main>
  )
}
```

- [ ] **Step 2: Create the client wrapper that submits**

Create `apps/web/src/components/listings/create-listing-client.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CategoryNode, PublicListing } from '@kgm/types'
import { ListingForm } from './listing-form'
import { apiFetchClient, ApiError } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

export function CreateListingClient({ categories, locale }: { categories: CategoryNode[]; locale: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(values: {
    title: string
    description: string
    price: string
    condition: 'NEW' | 'USED' | 'REFURBISHED'
    categoryId: string
    location?: string
  }) {
    setSubmitting(true)
    try {
      const res = await apiFetchClient<{ data: PublicListing }>('/listings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      })
      router.push(`/${locale}/sell/${res.data.id}/images`)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'error'
      toast({ variant: 'destructive', title: msg })
    } finally {
      setSubmitting(false)
    }
  }

  return <ListingForm mode="create" categories={categories} onSubmit={onSubmit} submitting={submitting} />
}
```

- [ ] **Step 3: Smoke-check**

Log in via the dev-login button. Navigate to `/ru/sell/new`. Fill out the form and submit — should redirect to `/ru/sell/<id>/images` (page doesn't exist yet; Task 22 creates it; a 404 is expected after submit until then).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/[locale]/sell apps/web/src/components/listings/create-listing-client.tsx
git commit -m "feat(web): /sell/new page with RHF-driven create flow"
```

---

## Task 21: ImageUploader component

**Files:**
- Create: `apps/web/src/components/listings/image-uploader.tsx`
- Create: `apps/web/src/components/listings/image-uploader.spec.tsx`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/components/listings/image-uploader.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ImageUploader } from './image-uploader'

const messages = {
  sell: { imagesHint: 'hint', imagesRemaining: 'remaining: {count}' },
  errors: { imageType: 'bad type', imageSize: 'too big', imageLimit: 'cap' },
  common: { loading: '...', save: 'Save' },
}

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="ru" messages={messages}>{ui}</NextIntlClientProvider>
}

describe('ImageUploader', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })
  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('rejects files larger than 5MB before uploading', async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' })
    render(wrap(<ImageUploader listingId="L" currentCount={0} onUploaded={vi.fn()} />))
    const input = screen.getByTestId('image-uploader-input') as HTMLInputElement
    await userEvent.upload(input, big)
    expect(screen.getByText(/too big/i)).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects non-image MIME types', async () => {
    const bad = new File(['x'], 'x.pdf', { type: 'application/pdf' })
    render(wrap(<ImageUploader listingId="L" currentCount={0} onUploaded={vi.fn()} />))
    const input = screen.getByTestId('image-uploader-input') as HTMLInputElement
    await userEvent.upload(input, bad)
    expect(screen.getByText(/bad type/i)).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects when at 10-image cap', async () => {
    const ok = new File(['x'], 'x.jpg', { type: 'image/jpeg' })
    render(wrap(<ImageUploader listingId="L" currentCount={10} onUploaded={vi.fn()} />))
    const input = screen.getByTestId('image-uploader-input') as HTMLInputElement
    await userEvent.upload(input, ok)
    expect(screen.getByText(/cap/i)).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter=@kgm/web test src/components/listings/image-uploader.spec.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/web/src/components/listings/image-uploader.tsx`:

```tsx
'use client'
import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024
const MAX_IMAGES = 10

export function ImageUploader({
  listingId,
  currentCount,
  onUploaded,
}: {
  listingId: string
  currentCount: number
  onUploaded: () => void
}) {
  const t = useTranslations('sell')
  const tErr = useTranslations('errors')
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const remaining = MAX_IMAGES - currentCount

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    for (const file of files) {
      if (remaining <= 0) {
        setError(tErr('imageLimit'))
        break
      }
      if (!ALLOWED_MIME.includes(file.type)) {
        setError(tErr('imageType'))
        continue
      }
      if (file.size > MAX_BYTES) {
        setError(tErr('imageSize'))
        continue
      }
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch(`/api/proxy/listings/${listingId}/images`, { method: 'POST', body: fd })
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } }
          toast({ variant: 'destructive', title: body.error?.message ?? tErr('imageType') })
        } else {
          onUploaded()
        }
      } finally {
        setUploading(false)
      }
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        data-testid="image-uploader-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={onFiles}
        className="hidden"
      />
      <div className="flex items-center gap-3">
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={uploading || remaining <= 0}>
          + {t('imagesHint')}
        </Button>
        <span className="text-sm text-muted-foreground">{t('imagesRemaining', { count: remaining })}</span>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter=@kgm/web test src/components/listings/image-uploader.spec.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/listings/image-uploader.tsx apps/web/src/components/listings/image-uploader.spec.tsx
git commit -m "feat(web): ImageUploader with client-side size/MIME/cap validation"
```

---

## Task 22: /sell/[id]/images page with Publish

**Files:**
- Create: `apps/web/src/app/[locale]/sell/[id]/images/page.tsx`
- Create: `apps/web/src/components/listings/images-editor.tsx`

- [ ] **Step 1: Create ImagesEditor client component**

Create `apps/web/src/components/listings/images-editor.tsx`:

```tsx
'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { PublicListing, PublicListingImage } from '@kgm/types'
import { Button } from '@/components/ui/button'
import { ImageUploader } from './image-uploader'
import { apiFetchClient, ApiError } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

export function ImagesEditor({
  listing,
  locale,
  showPublish,
}: {
  listing: PublicListing
  locale: string
  showPublish: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('common')
  const tSell = useTranslations('sell')
  const [images, setImages] = useState<PublicListingImage[]>(listing.images)
  const [publishing, setPublishing] = useState(false)

  function refreshFromServer() {
    router.refresh()
    // Also keep local state in sync visually until server re-sends
  }

  async function onDelete(imgId: string) {
    try {
      await apiFetchClient(`/listings/${listing.id}/images/${imgId}`, { method: 'DELETE' })
      setImages((prev) => prev.filter((i) => i.id !== imgId))
      router.refresh()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'error'
      toast({ variant: 'destructive', title: msg })
    }
  }

  async function onPublish() {
    setPublishing(true)
    try {
      await apiFetchClient(`/listings/${listing.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      })
      router.push(`/${locale}/listings/${listing.id}`)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'error'
      toast({ variant: 'destructive', title: msg })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-6">
      <ImageUploader listingId={listing.id} currentCount={images.length} onUploaded={refreshFromServer} />
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="relative group">
              <div className="relative aspect-square rounded-md overflow-hidden bg-muted">
                <Image src={img.url} alt="" fill className="object-cover" unoptimized />
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
                onClick={() => onDelete(img.id)}
              >
                {t('delete')}
              </Button>
            </div>
          ))}
        </div>
      )}
      {showPublish && (
        <div className="pt-4 border-t">
          {images.length === 0 && <p className="text-sm text-muted-foreground mb-2">{tSell('noImagesWarning')}</p>}
          <Button onClick={onPublish} disabled={images.length === 0 || publishing}>
            {publishing ? t('loading') : t('publish')}
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create server page**

Create `apps/web/src/app/[locale]/sell/[id]/images/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { PublicListing } from '@kgm/types'
import { apiFetch } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'
import { ImagesEditor } from '@/components/listings/images-editor'

type MineResponse = { data: { data: PublicListing[]; nextCursor: string | null } }

export default async function SellImagesPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  await requireAuth()
  const { locale, id } = await params
  const t = await getTranslations('sell')
  const mine = await apiFetch<MineResponse>('/listings/mine?limit=100')
  const listing = mine.data.data.find((l) => l.id === id)
  if (!listing) notFound()
  return (
    <main className="container py-8 space-y-6">
      <h1 className="text-2xl font-semibold">{t('imagesTitle')}</h1>
      <p className="text-sm text-muted-foreground">{t('imagesHint')}</p>
      <ImagesEditor listing={listing} locale={locale} showPublish={listing.status === 'DRAFT'} />
    </main>
  )
}
```

- [ ] **Step 3: Smoke-check end-to-end**

Dev-login → `/sell/new` → fill form → submit → lands on `/sell/<id>/images` → click "+" → pick a JPEG — image appears → Publish → redirects to `/listings/<id>`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/[locale]/sell/[id] apps/web/src/components/listings/images-editor.tsx
git commit -m "feat(web): /sell/[id]/images with upload, delete, and publish to ACTIVE"
```

---

## Task 23: StatusDropdown component

**Files:**
- Create: `apps/web/src/components/listings/status-dropdown.tsx`
- Create: `apps/web/src/components/listings/status-dropdown.spec.tsx`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/components/listings/status-dropdown.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'
import { StatusDropdown } from './status-dropdown'

const messages = {
  common: { status: { DRAFT: 'Draft', ACTIVE: 'Active', PAUSED: 'Paused', SOLD: 'Sold', REJECTED: 'Rejected', EXPIRED: 'Expired' } },
  dashboard: { deleteConfirmTitle: 'Sure?', deleteConfirmBody: 'final' },
}

describe('StatusDropdown', () => {
  it('shows only allowed transitions for ACTIVE', async () => {
    const onChange = vi.fn()
    render(
      <NextIntlClientProvider locale="ru" messages={messages}>
        <StatusDropdown current="ACTIVE" onChange={onChange} />
      </NextIntlClientProvider>,
    )
    const trigger = screen.getByRole('combobox')
    await userEvent.click(trigger)
    expect(screen.getByRole('option', { name: 'Draft' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Paused' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sold' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Rejected' })).toBeNull()
  })

  it('has no options when status is terminal', async () => {
    render(
      <NextIntlClientProvider locale="ru" messages={messages}>
        <StatusDropdown current="SOLD" onChange={vi.fn()} />
      </NextIntlClientProvider>,
    )
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter=@kgm/web test src/components/listings/status-dropdown.spec.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `apps/web/src/components/listings/status-dropdown.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { allowedNextStatuses, type ListingStatus } from '@/lib/listing-transitions'

export function StatusDropdown({
  current,
  onChange,
}: {
  current: ListingStatus
  onChange: (next: ListingStatus) => void | Promise<void>
}) {
  const t = useTranslations('common.status')
  const tD = useTranslations('dashboard')
  const options = allowedNextStatuses(current)
  const [pending, setPending] = useState<ListingStatus | null>(null)

  function handleSelect(value: string) {
    const next = value as ListingStatus
    if (next === 'SOLD') setPending(next)
    else onChange(next)
  }

  function confirmSold() {
    if (pending) onChange(pending)
    setPending(null)
  }

  return (
    <>
      <Select value={current} onValueChange={handleSelect} disabled={options.length === 0}>
        <SelectTrigger className="w-[180px]">
          <SelectValue>{t(current)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((s) => (
            <SelectItem key={s} value={s}>
              {t(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tD('deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>{tD('deleteConfirmBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>—</Button>
            <Button variant="destructive" onClick={confirmSold}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter=@kgm/web test src/components/listings/status-dropdown.spec.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/listings/status-dropdown.tsx apps/web/src/components/listings/status-dropdown.spec.tsx
git commit -m "feat(web): StatusDropdown enforces allowed transitions with SOLD confirm"
```

---

## Task 24: /dashboard — counts and table

**Files:**
- Create: `apps/web/src/app/[locale]/dashboard/page.tsx`
- Create: `apps/web/src/app/[locale]/dashboard/loading.tsx`
- Create: `apps/web/src/components/dashboard/dashboard-row.tsx`

- [ ] **Step 1: Create DashboardRow (client — has delete button)**

Create `apps/web/src/components/dashboard/dashboard-row.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { PublicListing } from '@kgm/types'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Price } from '@/components/common/price'
import { apiFetchClient, ApiError } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

function statusVariant(status: PublicListing['status']): BadgeProps['variant'] {
  switch (status) {
    case 'ACTIVE': return 'success'
    case 'DRAFT': return 'secondary'
    case 'SOLD': return 'default'
    case 'PAUSED': return 'warning'
    default: return 'destructive'
  }
}

export function DashboardRow({ listing, locale }: { listing: PublicListing; locale: string }) {
  const t = useTranslations('common')
  const tD = useTranslations('dashboard')
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function onDelete() {
    setDeleting(true)
    try {
      await apiFetchClient(`/listings/${listing.id}`, { method: 'DELETE' })
      setOpen(false)
      router.refresh()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'error'
      toast({ variant: 'destructive', title: msg })
    } finally {
      setDeleting(false)
    }
  }

  const createdFmt = new Intl.DateTimeFormat(locale === 'ky' ? 'ky-KG' : 'ru-RU', { dateStyle: 'short' }).format(
    new Date(listing.createdAt),
  )
  return (
    <tr className="border-b">
      <td className="py-2 pr-4">
        <Link href={`/${locale}/dashboard/listings/${listing.id}/edit`} className="hover:underline">
          {listing.title}
        </Link>
      </td>
      <td className="py-2 pr-4">
        <Badge variant={statusVariant(listing.status)}>{t(`status.${listing.status}`)}</Badge>
      </td>
      <td className="py-2 pr-4"><Price value={listing.price} /></td>
      <td className="py-2 pr-4 text-sm text-muted-foreground">{listing.viewCount}</td>
      <td className="py-2 pr-4 text-sm text-muted-foreground">{createdFmt}</td>
      <td className="py-2 text-right space-x-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/${locale}/dashboard/listings/${listing.id}/edit`}>{t('edit')}</Link>
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="destructive">{t('delete')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tD('deleteConfirmTitle')}</DialogTitle>
              <DialogDescription>{tD('deleteConfirmBody')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
              <Button variant="destructive" onClick={onDelete} disabled={deleting}>
                {deleting ? t('loading') : t('delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </td>
    </tr>
  )
}
```

- [ ] **Step 2: Create dashboard page**

Create `apps/web/src/app/[locale]/dashboard/page.tsx`:

```tsx
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { PublicListing } from '@kgm/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardRow } from '@/components/dashboard/dashboard-row'
import { apiFetch } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'

type MineResponse = { data: { data: PublicListing[]; nextCursor: string | null } }

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAuth()
  const { locale } = await params
  const t = await getTranslations('dashboard')
  const res = await apiFetch<MineResponse>('/listings/mine?limit=100')
  const items = res.data.data

  const counts = {
    active: items.filter((i) => i.status === 'ACTIVE').length,
    draft: items.filter((i) => i.status === 'DRAFT').length,
    sold: items.filter((i) => i.status === 'SOLD').length,
    paused: items.filter((i) => i.status === 'PAUSED').length,
    totalViews: items.reduce((sum, i) => sum + i.viewCount, 0),
  }

  return (
    <main className="container py-8 space-y-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardHeader><CardTitle className="text-3xl">{counts.active}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{t('stats.active')}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-3xl">{counts.draft}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{t('stats.draft')}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-3xl">{counts.sold}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{t('stats.sold')}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-3xl">{counts.paused}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{t('stats.paused')}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-3xl">{counts.totalViews}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{t('stats.totalViews')}</CardContent></Card>
      </div>
      {items.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <p className="text-muted-foreground">{t('empty')}</p>
          <Button asChild>
            <Link href={`/${locale}/sell/new`}>{t('createCta')}</Link>
          </Button>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="py-2 pr-4">{t('table.title')}</th>
              <th className="py-2 pr-4">{t('table.status')}</th>
              <th className="py-2 pr-4">{t('table.price')}</th>
              <th className="py-2 pr-4">{t('table.views')}</th>
              <th className="py-2 pr-4">{t('table.created')}</th>
              <th className="py-2 text-right">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <DashboardRow key={l.id} listing={l} locale={locale} />
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Create dashboard loading skeleton**

Create `apps/web/src/app/[locale]/dashboard/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <main className="container py-8 space-y-6">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-muted rounded-lg animate-pulse" />
    </main>
  )
}
```

- [ ] **Step 4: Smoke-check**

After creating + publishing a listing, navigate to `/ru/dashboard` — should show counts (sample data + created) and row per listing. Delete button opens dialog, deletes, and list refreshes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/[locale]/dashboard apps/web/src/components/dashboard
git commit -m "feat(web): dashboard with counts, table, and delete confirmation"
```

---

## Task 25: /dashboard/listings/[id]/edit

**Files:**
- Create: `apps/web/src/app/[locale]/dashboard/listings/[id]/edit/page.tsx`
- Create: `apps/web/src/components/listings/edit-listing-client.tsx`

- [ ] **Step 1: Create edit client wrapper**

Create `apps/web/src/components/listings/edit-listing-client.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { CategoryNode, PublicListing } from '@kgm/types'
import { ListingForm } from './listing-form'
import { ImagesEditor } from './images-editor'
import { StatusDropdown } from './status-dropdown'
import { apiFetchClient, ApiError } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import type { ListingStatus } from '@/lib/listing-transitions'

export function EditListingClient({
  listing,
  categories,
  locale,
}: {
  listing: PublicListing
  categories: CategoryNode[]
  locale: string
}) {
  const t = useTranslations('common')
  const router = useRouter()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  async function onFieldsSubmit(values: {
    title: string
    description: string
    price: string
    condition: 'NEW' | 'USED' | 'REFURBISHED'
    categoryId: string
    location?: string
  }) {
    setSubmitting(true)
    try {
      await apiFetchClient(`/listings/${listing.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      })
      router.refresh()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'error'
      toast({ variant: 'destructive', title: msg })
    } finally {
      setSubmitting(false)
    }
  }

  async function onStatusChange(next: ListingStatus) {
    try {
      await apiFetchClient(`/listings/${listing.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      router.refresh()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'error'
      toast({ variant: 'destructive', title: msg })
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-3">{t('edit')}</h2>
        <ListingForm
          mode="edit"
          categories={categories}
          initial={listing}
          onSubmit={onFieldsSubmit}
          submitting={submitting}
        />
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-3">{t('status.' + listing.status)}</h2>
        <StatusDropdown current={listing.status as ListingStatus} onChange={onStatusChange} />
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-3">Images</h2>
        <ImagesEditor listing={listing} locale={locale} showPublish={false} />
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Create server page**

Create `apps/web/src/app/[locale]/dashboard/listings/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { CategoryNode, PublicListing } from '@kgm/types'
import { apiFetch } from '@/lib/api'
import { requireAuth } from '@/lib/auth-guard'
import { EditListingClient } from '@/components/listings/edit-listing-client'

type MineResponse = { data: { data: PublicListing[]; nextCursor: string | null } }
type CategoriesResponse = { data: CategoryNode[] }

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  await requireAuth()
  const { locale, id } = await params
  const t = await getTranslations('common')
  const [mine, cats] = await Promise.all([
    apiFetch<MineResponse>('/listings/mine?limit=100'),
    apiFetch<CategoriesResponse>('/categories'),
  ])
  const listing = mine.data.data.find((l) => l.id === id)
  if (!listing) notFound()
  return (
    <main className="container py-8 space-y-6">
      <h1 className="text-2xl font-semibold">{t('edit')}: {listing.title}</h1>
      <EditListingClient listing={listing} categories={cats.data} locale={locale} />
    </main>
  )
}
```

- [ ] **Step 3: Smoke-check**

On `/ru/dashboard`, click "Edit" on a listing. Page loads pre-filled form, status dropdown, and image manager. Change title → save → refresh — shows updated title. Try status → `SOLD` → confirm dialog → OK — row in dashboard shows SOLD badge.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/[locale]/dashboard/listings apps/web/src/components/listings/edit-listing-client.tsx
git commit -m "feat(web): dashboard edit page with field patch, status transitions, images"
```

---

## Task 26: Error boundaries and not-found pages

**Files:**
- Create: `apps/web/src/app/[locale]/error.tsx`
- Create: `apps/web/src/app/[locale]/not-found.tsx`
- Create: `apps/web/src/app/[locale]/dashboard/error.tsx`

- [ ] **Step 1: Global locale error boundary**

Create `apps/web/src/app/[locale]/error.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('errors')
  const locale = useLocale()
  return (
    <main className="container py-16 text-center space-y-4">
      <h1 className="text-2xl font-semibold">{t('generic')}</h1>
      <p className="text-sm text-muted-foreground">{error.digest ?? error.message}</p>
      <div className="flex justify-center gap-3">
        <Button onClick={reset}>{t('generic')}</Button>
        <Button asChild variant="outline">
          <Link href={`/${locale}`}>Home</Link>
        </Button>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Not-found page**

Create `apps/web/src/app/[locale]/not-found.tsx`:

```tsx
import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { Button } from '@/components/ui/button'

export default async function NotFound() {
  const t = await getTranslations('errors')
  const locale = await getLocale()
  return (
    <main className="container py-16 text-center space-y-4">
      <h1 className="text-2xl font-semibold">{t('notFound')}</h1>
      <Button asChild>
        <Link href={`/${locale}`}>—</Link>
      </Button>
    </main>
  )
}
```

- [ ] **Step 3: Dashboard error boundary (offers dev-login)**

Create `apps/web/src/app/[locale]/dashboard/error.tsx`:

```tsx
'use client'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { DevLoginButton } from '@/components/auth/dev-login-button'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('errors')
  return (
    <main className="container py-16 text-center space-y-4">
      <h1 className="text-2xl font-semibold">{t('unauthorized')}</h1>
      <p className="text-sm text-muted-foreground">{error.digest ?? error.message}</p>
      <div className="flex justify-center gap-3">
        <DevLoginButton />
        <Button variant="outline" onClick={reset}>{t('generic')}</Button>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Verify**

Trigger 404 by visiting `/ru/listings/nonexistent-id`. Should render localized not-found. Log out, visit `/ru/dashboard` — middleware-guarded page redirects to `/` (requireAuth). For the dashboard error boundary, manually break by editing the page to throw — revert after verifying the boundary.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/[locale]/error.tsx apps/web/src/app/[locale]/not-found.tsx apps/web/src/app/[locale]/dashboard/error.tsx
git commit -m "feat(web): error boundaries and localized not-found pages"
```

---

## Task 27: Lint, type-check, test, build — full verification

**Files:** none

- [ ] **Step 1: Run all workspace checks**

Run:

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

Expected: all four pass. If anything fails, fix inline and commit the fix as `fix(web): ...` before proceeding.

- [ ] **Step 2: Commit any lint/type-check cleanup**

If fixes were needed:

```bash
git add -A
git commit -m "chore(web): lint and type-check cleanup for phase 1d"
```

If everything was already green, skip the commit.

---

## Task 28: End-to-end manual smoke walkthrough

**Files:** none — this is a manual verification task.

Execute each step and check the expected outcome before moving to the next. If any step fails, mark the task as BLOCKED and capture the failure in a new git commit comment or conversation note.

- [ ] **Step 1: Reset and seed**

```bash
pnpm db:reset
pnpm db:seed
```

Expected: output ends with `✓ seeded dev user and sample listings`.

- [ ] **Step 2: Start the stack**

Terminal A:

```bash
pnpm --filter=@kgm/api dev
```

Terminal B:

```bash
pnpm --filter=@kgm/web dev
```

Wait for both to report "ready".

- [ ] **Step 3: Home page (unauthed)**

Open `http://localhost:3000/`. Expected: redirected to `http://localhost:3000/ru`. Hero heading visible. 3 sample listings shown in the featured grid. Header shows "Dev login" button.

- [ ] **Step 4: Browse + filter**

Click "Смотреть все" (or navigate to `/ru/listings`). Expected: 3 listings render. Open the category dropdown; pick "Телефоны". URL updates to `?categoryId=...`. Grid shows only the iPhone listing. Click "Сбросить фильтр" — returns to all three.

- [ ] **Step 5: Detail**

Click the iPhone card. Expected: detail page renders with image gallery, price `65 000 сом` (or locale-formatted equivalent), condition badge "Б/у", description, view count, created date. "Связаться с продавцом" button visible and disabled.

- [ ] **Step 6: Dev login**

Click "Войти (dev)" in the header. Expected: header refreshes to show "Кабинет" link and "Выйти" button.

- [ ] **Step 7: Create listing**

Navigate to `/ru/sell/new`. Fill:
- title: "Test велосипед"
- description: "Хороший велосипед в отличном состоянии, катался одно лето"
- price: "8000"
- condition: Б/у
- category: "Дом и сад" → "Сад и огород"
- location: "Бишкек"

Click "Сохранить". Expected: redirected to `/ru/sell/<id>/images`. The new listing shows 0 images, "Осталось слотов: 10".

- [ ] **Step 8: Upload images**

Click the upload button and pick 2 JPEG files (any images ≤ 5MB each). Expected: both appear in the grid below. Counter updates to "Осталось слотов: 8".

- [ ] **Step 9: Publish**

Click "Опубликовать". Expected: redirected to `/ru/listings/<id>`. Detail page shows the uploaded images, title, price, description.

- [ ] **Step 10: Dashboard**

Navigate to `/ru/dashboard`. Expected: counts show `active: 4, draft: 0, sold: 0, paused: 0, totalViews: >0`. Table lists all 4 listings (3 seed + 1 new).

- [ ] **Step 11: Edit + status transition**

Click "Редактировать" on the new listing. Change title to "Test велосипед (обновлён)". Click "Сохранить". Expected: toast or silent success. Navigate back to `/ru/dashboard` — title updated.

Open edit again. Change status dropdown to "Продано". Confirm the dialog. Expected: row in dashboard now shows "Продано" badge; status dropdown on edit page now disabled (SOLD is terminal).

- [ ] **Step 12: Delete**

From the dashboard, click "Удалить" on the test listing. Confirm in dialog. Expected: row disappears; counts update.

- [ ] **Step 13: 404 on soft-deleted**

Open `/ru/listings/<deleted-id>`. Expected: localized 404 page.

- [ ] **Step 14: Locale switch**

Switch to Кыргызча via the dropdown. Expected: URL changes to `/ky/...`; strings render (same Russian values for now — expected). `html lang="ky"` set.

- [ ] **Step 15: Logout**

Click "Выйти". Expected: header reverts to "Войти (dev)". `/ky/dashboard` now redirects to `/ky`.

- [ ] **Step 16: Mark complete and commit**

Update the plan file's Task 28 checkbox list with passing results inline. Then:

```bash
git add docs/superpowers/plans/2026-04-20-phase-1d-web-frontend.md
git commit -m "docs(plan): mark phase 1d smoke walkthrough complete"
```

---

## Task 29: Update memory and merge to main

**Files:** none (memory update performed by the agent; git merge performed by the user or agent per convention)

- [ ] **Step 1: Update the project memory**

Update `/Users/ruwuioli/.claude/projects/-Users-ruwuioli-Documents-kgm/memory/project_kgm.md`:
- Change `Plan 1d` status to `merged` once the branch is merged.
- Capture any findings worth remembering (e.g., next-intl quirks, shadcn theme gotchas, MinIO remotePatterns requirement).
- Update "Next session priorities" to point at the follow-on plan (Phase 2 search, or messaging, as the user decides).

- [ ] **Step 2: Merge the branch**

From `main`:

```bash
git checkout main
git merge --no-ff feat/phase-1d-web-frontend -m "Merge branch 'feat/phase-1d-web-frontend'"
git branch -d feat/phase-1d-web-frontend
```

Do not push to origin (per memory: user handles remote pushes).

---

## Summary

- 29 tasks. Most are ~5–10 minutes apiece; Task 3 (shadcn components) and Task 11 (i18n scaffold + layout move) are the heaviest.
- Tasks 2, 4–9, 13, 15, 19, 21, 23 are TDD (red → green → commit).
- Tasks 1, 10, 12, 16–18, 20, 22, 24–27 are non-TDD mechanical/UI scaffolding verified by build + manual browser check.
- Task 28 is the manual end-to-end walkthrough mirroring Phase 1c's closing ritual.
- Task 29 merges the branch to local main and updates memory.

## DRY / YAGNI / TDD notes

- `apiFetch` (server) and `apiFetchClient` (client) are intentionally separate because Next 15 restricts `next/headers` to Server Components. Both share the `ApiError` shape but export from different modules.
- No retry logic, no auto-refresh, no feature flags, no lazy translations. All explicitly deferred.
- Shadcn components are written by hand (not via CLI) because the CLI's interactive init doesn't fit the subagent execution model; the code is the canonical shadcn output.
- Tests are smoke-style per user choice (Q6C) — one test per component covering the most load-bearing behavior, not exhaustive coverage.
