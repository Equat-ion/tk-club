import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Check if organizer record exists
      const { data: existingOrganizer } = await supabase
        .from('organizers')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .single()

      // Create organizer record if it doesn't exist
      if (!existingOrganizer) {
        const { error: organizerError } = await supabase
          .from('organizers')
          .insert({
            auth_user_id: data.user.id,
            email: data.user.email!,
          } as never)

        if (organizerError) {
          console.error('Failed to create organizer:', organizerError)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
