import React from 'react'

const Features = () => {
  return (
    <div className='px-10'>
        <div className='text-4xl font-medium flex justify-center'>
            Features
        </div>
        <ul className='my-10'>
            <li>
                <div className='h-48 flex justify-around items-center'>
                    <div className="text-2xl font-medium flex flex-col gap-4">
                        Live Collabration
                        <div className="text-sm w-72">The live collab feature allows real-time document editing and collaboration, enabling seamless teamwork and instant updates.</div>
                    </div>
                    <div className=''>
                        <img src="/collab.png" width={200} height={200} alt="collab illustrations" />
                    </div>
                </div>
            </li>
            <li>
                <div className='h-48 flex justify-around items-center'>
                    <div className="text-2xl font-medium flex flex-col gap-4">
                        Multiple Format 
                        <div className='text-sm w-72'>Edit all your documents in one place with  multiple file format support </div>
                    </div>
                    <div className=''>
                        <img src="/support.png" width={200} height={200} alt="collab illustrations" />
                    </div>
                </div>
            </li>
            <li>
                <div className='h-48 flex justify-around items-center'>
                    <div className="text-2xl font-medium flex flex-col gap-4">
                        Offline Editing
                        <div className='text-sm w-72'>The offline feature enables document editing without an internet connection, syncing changes once back online.</div>
                    </div>
                    <div className=''>
                        <img src="/offline.png" width={200} height={200} alt="collab illustrations" />
                    </div>
                </div>
            </li>
        </ul>
    </div>
  )
}

export default Features