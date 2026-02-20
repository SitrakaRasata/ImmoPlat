import * as React from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabaseClient from '../shared/supabaseClient.ts'


export const LoginPage = () => {

    // Global state
    const [mode, setMode] = useState<'signin' | 'signup'>('signin')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // User Attributes
    const [email, setEmail] = useState('supa.user1@yopmail.com')
    const [password, setPassword] = useState('J9@13zX?rjwz!')
    const [firstname, setFirstname] = useState('Jean')
    const [lastname, setLastname] = useState('Dupont')
    const [role, setRole] = useState<'agent' | 'client'>('client')

    const navigate = useNavigate()

    async function handleSubmit(e: React.FormEvent) {

        e.preventDefault()
        setLoading(true)
        setError('')

        if (mode === 'signin') {

            const { error } = await supabaseClient.auth.signInWithPassword({ email, password })

            if (error) setError(error.message)
            else navigate('/')

        } else {

            const { error } = await supabaseClient.auth.signUp({
                email, password,
                options: { data: { firstname, lastname, role } }
            })

            if (error) setError(error.message)
            else navigate('/')

        }

        setLoading(false)

    }

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h1>ImmoPlat</h1>

                <div className="tab-row">
                    <button className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>Connexion
                    </button>
                    <button className={mode === 'signup' ? 'active' : ''}
                            onClick={() => setMode('signup')}>Inscription
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {mode === 'signup' && (
                        <>
                            <div className="form-group">
                                <label>Prénom</label>
                                <input value={firstname} onChange={e => setFirstname(e.target.value)} required/>
                            </div>
                            <div className="form-group">
                                <label>Nom</label>
                                <input value={lastname} onChange={e => setLastname(e.target.value)} required/>
                            </div>
                            <div className="form-group">
                                <label>Je suis...</label>
                                <div className="role-row">
                                    <button type="button" className={role === 'client' ? 'active' : ''}
                                            onClick={() => setRole('client')}>🔍 Client
                                    </button>
                                    <button type="button" className={role === 'agent' ? 'active' : ''}
                                            onClick={() => setRole('agent')}>🏢 Agent
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required/>
                    </div>
                    <div className="form-group">
                        <label>Mot de passe</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                               minLength={6}/>
                    </div>

                    {error && <p className="error">{error}</p>}

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}
                            disabled={loading}>
                        {loading ? 'Chargement...' : mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
                    </button>
                </form>
            </div>
        </div>
    )

}