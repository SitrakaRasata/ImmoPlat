import { useEffect, useState } from 'react'
import type { Profile } from '../types.ts'
import supabaseClient from '../supabaseClient.ts'


export function useAuth() {

    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    async function getCurrentSession() {

        const { data: { session } } = await supabaseClient.auth
            .getSession()

        if (session?.user) {

            const { data } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()

            setProfile(data)

        }

        setLoading(false)

    }

    useEffect(() => {

        getCurrentSession()

        const { data: { subscription } } = supabaseClient.auth
            .onAuthStateChange(async (_e, session) => {

                if (session?.user) {

                    const { data } = await supabaseClient
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single()

                    setProfile(data)

                } else setProfile(null)

            })

        return () => subscription.unsubscribe()

    }, [])

    return { profile, loading }

}