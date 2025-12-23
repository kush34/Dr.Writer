import { Brain, Cloudy, FileText, Handshake } from 'lucide-react'
import React from 'react'

const Features = () => {
    const Features = [
        {
            icon: <FileText />,
            title: "All your Docs",
            info: "Edit all your documents in one place with out switching softwares."
        },
        {
            icon: <Brain />,
            title: "Integrate AI with your flow",
            info: "AI assisting you improving your productivity."
        },
        {
            icon: <Handshake />,
            title: "Collab with colleague",
            info: "Edit documents with your colleague with collab feature."
        },
        {
            icon: <Cloudy />,
            title: "Access anywhere on cloud",
            info: "Edit documents with your colleague with collab feature."
        },
    ]
    return (
        <div className='my-10'>
            <div className='text-4xl text-secondary font-medium flex justify-center'>
                Features
            </div>
            <div className="grid place-items-center text-secondary m-12">
                <ul className="grid grid-cols-2 gap-12 max-w-4xl">
                    {Features.map((feature,index) => {
                        return (
                            <li key={index} className='flex flex-col flex-wrap gap-2 border shadow p-5 rounded-2xl hover:shadow-none cursor-pointer transition-200ms ease-in'>
                                <span>{feature.icon}</span>
                                <h2 className='font-bold'>{feature.title}</h2>
                                <p className='max-w-sm'>{feature.info}</p>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    )
}

export default Features