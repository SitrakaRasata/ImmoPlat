import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'
import { LoginPage } from './pages/LoginPage.tsx'
import { PropertiesPage } from './pages/PropertiesPage.tsx'
import { MyPropertiesPage } from './pages/MyPropertiesPage.tsx'
import { useAuth } from './shared/hooks/useAuth.ts'
import supabaseClient from './shared/supabaseClient.ts'


function Navbar() {

    const { profile } = useAuth()
    const navigate = useNavigate()

    const signOut = async () => {

        await supabaseClient.auth.signOut()
        navigate('/login')

    }

    return (
        <nav>
            <Link to="/" className="logo">🏠 ImmoPlat</Link>
            <div>
                <Link to="/">Annonces</Link>
                {profile?.role === 'agent' && <Link to="/my-properties">Mes biens</Link>}
                {profile
                    ? <button className="btn" style={{ marginLeft: '1rem' }} onClick={signOut}>Déconnexion</button>
                    : <Link to="/login" style={{ marginLeft: '1rem' }}>Connexion</Link>
                }
            </div>
        </nav>
    )

}

export function RequireAgent({ children }: { children: React.ReactNode }) {

    const { profile, loading } = useAuth()

    if (loading) return <p className="loading">Chargement...</p>

    if (!profile) return <Navigate to="/login" replace/>

    if (profile.role !== 'agent') return <Navigate to="/" replace/>

    return <>{children}</>

}

function App() {

    return (
        <BrowserRouter>
            <Navbar/>
            <Routes>
                <Route path="/login" element={<LoginPage/>}/>
                <Route path="/" element={<PropertiesPage/>}/>
                <Route path="/my-properties" element={<RequireAgent><MyPropertiesPage/></RequireAgent>}/>
                <Route path="*" element={<Navigate to="/" replace/>}/>
            </Routes>
        </BrowserRouter>
    )
}

export default App
