import { useEffect, useState } from 'react'
import supabaseClient from '../shared/supabaseClient.ts'
import type { Property } from '../shared/types.ts'


const empty = { title: '', description: '', price: 0, city: '', is_published: false }

export const MyPropertiesPage = () => {

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const [properties, setProperties] = useState<Property[]>([])

    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState(empty)

    useEffect(() => {
        fetchMyProps()
    }, [])

    const fetchMyProps = async () => {
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) return
        const { data } = await supabaseClient
            .from('properties').select('*')
            .eq('agent_id', user.id)
            .order('created_at', { ascending: false })
        setProperties(data ?? [])
        setLoading(false)
    }

    const handleCreate = async (e: React.FormEvent) => {

        e.preventDefault()
        setSubmitting(true)
        setError('')

        const { data: { user } } = await supabaseClient.auth.getUser()

        const { data, error } = await supabaseClient
            .from('properties')
            .insert({ ...form, agent_id: user!.id })
            .select()
            .single()

        if (error) {
            setError(error.message);
            setSubmitting(false);
            return
        }

        setProperties(prev => [data, ...prev])
        setForm(empty)
        setShowForm(false)
        setSubmitting(false)

    }

    async function togglePublish(p: Property) {

        await supabaseClient.from('properties').update({ is_published: !p.is_published }).eq('id', p.id)
        setProperties(prev => prev.map(x => x.id === p.id ? { ...x, is_published: !p.is_published } : x))

    }

    async function handleDelete(id: string) {

        if (!confirm('Supprimer ce bien ?')) return

        await supabaseClient.from('properties').delete().eq('id', id)
        setProperties(prev => prev.filter(p => p.id !== id))

    }

    if (loading) return <p className="loading">Chargement...</p>

    return (
        <div className="page">
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
            }}>
                <h1 style={{ margin: 0 }}>Mes biens ({properties.length})</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Annuler' : '+ Nouveau bien'}
                </button>
            </div>

            {showForm && (
                <div className="form-card">
                    <h2>Ajouter un bien</h2>
                    <form onSubmit={handleCreate}>
                        <div className="form-group">
                            <label>Titre</label>
                            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                   required/>
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea value={form.description}
                                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}/>
                        </div>
                        <div className="form-group">
                            <label>Prix (€)</label>
                            <input type="number" value={form.price}
                                   onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} min={0}
                                   required/>
                        </div>
                        <div className="form-group">
                            <label>Ville</label>
                            <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                                   required/>
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.is_published}
                                       onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}
                                       style={{ width: 'auto' }}/>
                                Publier immédiatement
                            </label>
                        </div>
                        {error && <p className="error">{error}</p>}
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Enregistrement...' : 'Créer le bien'}
                        </button>
                    </form>
                </div>
            )}

            {properties.length === 0
                ? <p className="empty">Aucun bien. Cliquez sur &quot;+ Nouveau bien&quot; pour commencer.</p>
                : (
                    <div className="grid">
                        {properties.map(p => (
                            <div className="card" key={p.id}>
                <span className={`badge ${p.is_published ? 'published' : 'draft'}`}>
                  {p.is_published ? 'Publié' : 'Brouillon'}
                </span>
                                <h3>{p.title}</h3>
                                <p className="price">{p.price.toLocaleString('fr-FR')} €</p>
                                <p className="city">📍 {p.city}</p>
                                <div className="card-actions">
                                    <button className="btn" onClick={() => togglePublish(p)}>
                                        {p.is_published ? 'Dépublier' : 'Publier'}
                                    </button>
                                    <button className="btn btn-danger" onClick={() => handleDelete(p.id)}>Supprimer
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }
        </div>
    )

}