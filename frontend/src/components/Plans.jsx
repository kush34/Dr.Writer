import React from 'react'

const Plans = () => {
  return (
    <div className='px-10'>
        <div className='text-4xl font-medium flex justify-center'>
            Our Plans
        </div>
        <div className='m-10 flex justify-center gap-5'>
            <div className="card w-[300px] h-[60vh] border rounded flex flex-col justify-between">
                <div className="title font-medium p-2   ">
                    Free Plan
                    <div className="mt-4 features p-2 text-sm">
                        <ul>
                            <li> * upto 10 files</li>
                            <li> * 10 prompts per 5 min</li>
                            <li> * no support</li>
                        </ul>
                    </div>
                </div>
                <div className="price m-2 py-2  border border-zinc-100 relative rounded flex justify-center">
                    $0
                </div>
            </div>
            <div className="card w-[300px] h-[60vh] border rounded flex flex-col justify-between">
                <div className="title font-medium p-2   ">
                    Standard Plan
                    <div className="mt-4 features p-2 text-sm">
                        <ul>
                            <li> * upto 100 files</li>
                            <li> * 100 prompts per 5 min</li>
                            <li> * 24/7 support</li>
                        </ul>
                    </div>
                </div>
                <div className="price m-2 py-2  border border-zinc-100 relative rounded flex justify-center">
                    $20
                </div>
            </div>
            <div className="card w-[300px] h-[60vh] border rounded flex flex-col justify-between">
                <div className="title font-medium p-2   ">
                    Plus Plan
                    <div className="mt-4 features p-2 text-sm">
                        <ul>
                            <li> * upto 200 files</li>
                            <li> * 200 prompts per 5 min</li>
                            <li> * 24/7 support</li>
                        </ul>
                    </div>
                </div>
                <div className="price m-2 py-2  border border-zinc-100 relative rounded flex justify-center">
                    $50
                </div>
            </div>
        </div>
    </div>
  )
}

export default Plans