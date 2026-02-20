import './App.css'
import { useEffect } from 'react'
import supabaseClient from './utils/supabaseClient.ts'


function App() {

    async function fetchProperties() {

        const { error, data } = await supabaseClient
            .from('properties')
            .select('*')

        if (error) return console.error(error)

        console.log(data)

    }

    useEffect(() => {
        fetchProperties()
    }, [])

    return (
        <>
            <p>Hello world!</p>
        </>
    )
}

export default App
