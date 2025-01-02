import React,{useState} from 'react'
import { createUser } from '../firebaseAuth/firebaseConfig';
const Register = () => {
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');

  const handleSubmit = ()=>{
    console.log(email,password);
    createUser(email,password);
  }
  return (
    <div>
      <div className="title flex flex-col items-center">
        <h1 className='text-2xl font-semibold'>Get Started</h1>
        <p className='text-sm text-zinc-600'>enter your details</p>
      </div>
      <div className="form m-4 text-sm flex flex-col items-center gap-4">
        <input onChange={(e)=>setEmail(e.target.value)} type="text" placeholder='Enter your email' className='bg-zinc-800 px-4 py-2 rounded outline-none' />
        <input onChange={(e)=>setPassword(e.target.value)} type="password" placeholder='Choose your password' className='bg-zinc-800 px-4 py-2 rounded outline-none' />
        <button onClick={handleSubmit} className='rounded bg-blue-700 px-4 py-1 hover:bg-blue-900'>Submit</button>
      </div>
      <div className="firebase-login-options flex justify-center items-center gap-4 m-4">
      </div>
    </div>
  )
}

export default Register 