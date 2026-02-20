import { useEffect, useState } from 'react'
import supabaseClient from '../shared/supabaseClient.ts'
import type { Property } from '../shared/types.ts'


export const PropertiesPage = () => {

    const [properties, setProperties] = useState<Property[]>([])
    const [loading, setLoading] = useState(true)

    const fetchProperties = async () => {

        const { error, data } = await supabaseClient.from('properties')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false })

        if (error) console.error(error.message)

        console.log({ data })

        setProperties(data ?? []);
        setLoading(false)

    }

    useEffect(() => {
        fetchProperties()
    }, [])

    if (loading) return <p className="loading">Chargement...</p>

    return (
        <div className="page">
            <h1>Annonces ({properties.length})</h1>

            {properties.length === 0
                ? <p className="empty">Aucune annonce disponible.</p>
                : (
                    <div className="grid">
                        {properties.map(p => (
                            <div className="card" key={p.id}>
                                <h3>{p.title}</h3>
                                {p.description && <p style={{
                                    fontSize: '0.85rem',
                                    color: '#555',
                                    margin: '0.3rem 0'
                                }}>{p.description}</p>}
                                <p className="price">{p.price.toLocaleString('fr-FR')} €</p>
                                <p className="city">📍 {p.city}</p>
                            </div>
                        ))}
                    </div>
                )
            }
        </div>
    )
}