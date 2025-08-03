import React, { useState } from 'react'
import { signIn,googleSignInPopUp } from '../firebaseAuth/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Description } from '@radix-ui/react-dialog';

const Login = () => {
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [isLoading,setIsLoading] = useState(false);
  const [passtype,setPassType] = useState(false);
  const navigate = useNavigate();
  const {toast} = useToast();
  const handleSubmit = async ()=>{
    setIsLoading(true);
    try {
      const res = await signIn(email,password);
      // console.log(res)
      if(res){
        navigate('/home');
      }
      else{
        // setIsLoading(false);
        toast({
          description:"Wrong credentials"
        })
      }
      
    } catch (error) {
      toast({
        description:"Wrong credentials"
      })
      
    }finally{
      setIsLoading(false);
    }
  }
  const handleGoogleLogin = async ()=>{
    setIsLoading(true);
    try {
      const res = await googleSignInPopUp();
      if(res){
        navigate('/home');
      }
      
    } catch (error) {
        toast({
          description:"Wrong credentials"
        })
    }
    setIsLoading(false);
    return;
  }
  return (
    <div>
      <div className="title flex flex-col items-center">
        <h1 className='text-2xl font-semibold'>Login</h1>
        <p className='text-sm text-zinc-600'>enter your credentials</p>
      </div>
      <div className="form m-4 text-sm flex flex-col items-center gap-4">
        <div className='flex bg-zinc-800 rounded'>
          <input onChange={(e)=>setEmail(e.target.value)}  type="text" placeholder='enter your email' className='mr-8 px-2 py-2 bg-zinc-800 rounded outline-none' />
        </div>
        <div className='flex bg-zinc-800 items-center rounded'>
          <input onChange={(e)=>setPassword(e.target.value)} type={`${passtype ? " text": "password"}`}  placeholder='enter your password' className='bg-zinc-800 px-2 py-2 rounded outline-none' />
          {passtype ?
              <Eye 
                onClick={()=>setPassType(value=>!value)}
                className='m-1'
              />
            :
              <EyeOff 
                onClick={()=>setPassType(value=>!value)}
                className='m-1'
              />
          }
        </div>
        {
          isLoading ?
          <div>Loading...</div>
          :
          <button onClick={handleSubmit} className='rounded bg-blue-700 px-4 py-1 hover:bg-blue-900'>Submit</button>
        }
      </div>
      <div className="firebase-login-options flex justify-center items-center gap-4 m-4">
        <button onClick={handleGoogleLogin} className='rounded  px-4 py-1 bg-green-600 hover:bg-green-700'>Google</button>
      </div>
    </div>
  )
}

export default Login