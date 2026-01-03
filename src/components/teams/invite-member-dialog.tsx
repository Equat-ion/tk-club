'use client'

import { useState } from 'react'
import { Copy, Check, Link as LinkIcon, Envelope, Trash } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  useEventInvites, 
  useCreateEmailInvite, 
  useCreateLinkInvite,
  useRevokeInvite,
} from '@/hooks/use-teams'

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  eventId,
}: InviteMemberDialogProps) {
  const [email, setEmail] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  const { data: invites, isLoading: loadingInvites } = useEventInvites(eventId)
  const createEmailInvite = useCreateEmailInvite()
  const createLinkInvite = useCreateLinkInvite()
  const revokeInvite = useRevokeInvite()

  // Filter active link invites
  const linkInvites = invites?.filter(
    inv => inv.invite_type === 'link' && 
    !inv.used_at && 
    new Date(inv.expires_at) > new Date()
  ) || []

  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError(null)
    
    if (!email.trim()) {
      setEmailError('Email is required')
      return
    }
    
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address')
      return
    }

    try {
      await createEmailInvite.mutateAsync({
        eventId,
        email: email.trim(),
      })
      setEmail('')
      setEmailSent(true)
      setTimeout(() => setEmailSent(false), 3000)
    } catch (error) {
      setEmailError('Failed to send invite. Please try again.')
      console.error('Failed to send email invite:', error)
    }
  }

  const handleGenerateLink = async () => {
    try {
      await createLinkInvite.mutateAsync(eventId)
    } catch (error) {
      console.error('Failed to generate invite link:', error)
    }
  }

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}/invite/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await revokeInvite.mutateAsync({ inviteId, eventId })
    } catch (error) {
      console.error('Failed to revoke invite:', error)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setEmail('')
      setEmailError(null)
      setEmailSent(false)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Invite someone to join this event as a member.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="email" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="gap-2">
              <Envelope className="size-4" />
              Email Invite
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-2">
              <LinkIcon className="size-4" />
              Link Invite
            </TabsTrigger>
          </TabsList>

          {/* Email Invite Tab */}
          <TabsContent value="email" className="mt-4">
            <form onSubmit={handleSendEmailInvite}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setEmailError(null)
                    }}
                  />
                  {emailError && (
                    <p className="text-sm text-destructive">{emailError}</p>
                  )}
                  {emailSent && (
                    <p className="text-sm text-green-600">Invite created successfully!</p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  An invite will be created. Share the link with them or they can sign up and use the invite token.
                </p>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createEmailInvite.isPending}
                >
                  {createEmailInvite.isPending ? 'Sending...' : 'Send Invite'}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Link Invite Tab */}
          <TabsContent value="link" className="mt-4">
            <div className="space-y-4">
              <Button 
                onClick={handleGenerateLink} 
                className="w-full"
                disabled={createLinkInvite.isPending}
              >
                {createLinkInvite.isPending ? 'Generating...' : 'Generate New Link'}
              </Button>

              <div className="space-y-2">
                <Label>Active Invite Links</Label>
                {loadingInvites ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : linkInvites.length > 0 ? (
                  <ScrollArea className="h-50">
                    <div className="space-y-2">
                      {linkInvites.map((invite) => (
                        <div
                          key={invite.id}
                          className="flex items-center gap-2 p-3 border rounded-none"
                        >
                          <div className="flex-1 min-w-0">
                            <code className="text-xs text-muted-foreground truncate block">
                              {`${window.location.origin}/invite/${invite.token.slice(0, 8)}...`}
                            </code>
                            <p className="text-xs text-muted-foreground mt-1">
                              Expires {format(new Date(invite.expires_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => handleCopyLink(invite.token)}
                          >
                            {copiedToken === invite.token ? (
                              <Check className="size-4 text-green-600" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => handleRevokeInvite(invite.id)}
                          >
                            <Trash className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No active invite links. Generate one above.
                  </p>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Share invite links with anyone. Links expire after 48 hours and can only be used once.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
