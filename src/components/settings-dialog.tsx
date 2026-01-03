'use client'

import { Sun, Moon, Desktop } from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAppStore, type ThemePreference } from '@/lib/store'
import { useUpdateUserSettings } from '@/hooks/use-settings'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const themes: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun className="size-5" /> },
  { value: 'dark', label: 'Dark', icon: <Moon className="size-5" /> },
  { value: 'system', label: 'System', icon: <Desktop className="size-5" /> },
]

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const themePreference = useAppStore((state) => state.themePreference)
  const setThemePreference = useAppStore((state) => state.setThemePreference)
  const updateSettings = useUpdateUserSettings()

  const handleThemeChange = (theme: ThemePreference) => {
    setThemePreference(theme)
    updateSettings.mutate({ theme_preference: theme })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your experience
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Theme</Label>
              <p className="text-xs text-muted-foreground">
                Select your preferred theme. System matches your OS setting.
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => handleThemeChange(theme.value)}
                  disabled={updateSettings.isPending}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-none border p-4 transition-colors disabled:opacity-50',
                    themePreference === theme.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  <div className={cn(
                    'flex size-10 items-center justify-center rounded-none',
                    themePreference === theme.value 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  )}>
                    {theme.icon}
                  </div>
                  <span className="text-xs font-medium">{theme.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
