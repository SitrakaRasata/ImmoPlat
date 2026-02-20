export interface Profile {
    id: string
    role: 'agent' | 'client'
    firstname: string
    lastname: string
}

export interface Property {
    id: string
    title: string
    description: string | null
    price: number
    city: string
    agent_id: string
    is_published: boolean
    created_at: string
}