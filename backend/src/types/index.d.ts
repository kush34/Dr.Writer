export interface tChat {
    prompt: string
    response: string
    documentId: string
    createdAt: string
    updatedAt: string
}

export interface tDocument {
    title: string
    content: object
    user_id: string
    users: String[]
    createdAt: string
}

export interface tUser {
    name: string
    email: string
}

export interface tPlan{
    id:string,
    name:string
    monthly_credits:number
}

export interface tUsage {
    id:string
    user_id:string
    mode:string,
    input_tokens:number
    output_tokens:number
    cost:number
    createdAt:string
}   