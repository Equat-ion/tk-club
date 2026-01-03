'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { WarningCircle, CheckCircle, ArrowRight, House } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useValidateInvite, useAcceptInvite } from '@/hooks/use-teams'
import { createClient } from '@/lib/supabase/client'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  const { data: invite, isLoading, error } = useValidateInvite(token)
  const acceptInvite = useAcceptInvite()

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }
    checkAuth()
  }, [])

  const handleAcceptInvite = async () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(`/invite/${token}`)
      router.push(`/login?returnTo=${returnUrl}`)
      return
    }

    setIsAccepting(true)
    setAcceptError(null)

    try {
      const result = await acceptInvite.mutateAsync(token)
      
      if (result.alreadyMember) {
        router.push(`/events/${result.eventId}/team`)
      } else {
        router.push(`/events/${result.eventId}/team`)
      }
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : 'Failed to accept invite')
      setIsAccepting(false)
    }
  }

  // Loading state
  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-16 w-16 rounded-lg mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Invalid or expired token
  if (error || !invite || !invite.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 size-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <WarningCircle className="size-8 text-destructive" weight="fill" />
            </div>
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>
              This invite link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <Link href="/">
                <House className="size-4 mr-2" />
                Go to Events
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const event = invite.event as { id: string; name: string; icon: string | null } | null

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 size-16 rounded-lg bg-primary/10 flex items-center justify-center text-3xl">
            {event?.icon || '🎉'}
          </div>
          <CardTitle className="text-xl">
            You&apos;re invited to join
          </CardTitle>
          <CardDescription className="text-lg font-medium text-foreground">
            {event?.name || 'Event'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {acceptError && (
            <div className="p-3 rounded-none border border-destructive/20 bg-destructive/10 text-destructive text-sm">
              {acceptError}
            </div>
          )}
          
          <Button 
            onClick={handleAcceptInvite} 
            className="w-full"
            disabled={isAccepting}
          >
            {isAccepting ? (
              'Accepting...'
            ) : isAuthenticated ? (
              <>
                Accept Invite
                <ArrowRight className="size-4 ml-2" />
              </>
            ) : (
              <>
                Sign in to Accept
                <ArrowRight className="size-4 ml-2" />
              </>
            )}
          </Button>

          {!isAuthenticated && (
            <p className="text-sm text-muted-foreground text-center">
              You&apos;ll need to sign in or create an account to join this event.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
