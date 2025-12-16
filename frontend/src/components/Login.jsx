import React, { useState } from 'react'
import { signIn, googleSignInPopUp } from '../firebaseAuth/firebaseConfig';
import { Link, useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Description } from '@radix-ui/react-dialog';
import { Input } from './ui/input';
import Loader from './loaders/Loader';

const Login = ({ setFlag }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passtype, setPassType] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const res = await signIn(email, password);
      // console.log(res)
      if (res) {
        navigate('/home');
      }
      else {
        // setIsLoading(false);
        toast({
          description: "Wrong credentials"
        })
      }

    } catch (error) {
      toast({
        description: "Wrong credentials"
      })

    } finally {
      setIsLoading(false);
    }
  }
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const res = await googleSignInPopUp();
      if (res) {
        navigate('/home');
      }

    } catch (error) {
      toast({
        description: "Wrong credentials"
      })
    }
    setIsLoading(false);
    return;
  }
  return (
    <div className='flex flex-col gap-12 w-full h-screen bg-slate-100 text-black'>
      <div className="title text-4xl font-medium flex flex-col items-center mt-16 w-full">
        <span className=''>
          Dr.Writer
        </span>
        <span className='text-sm font-light text-zinc-500'>
          simple no nonsense editor
        </span>
      </div>
      <div className="loginform mt-16 flex flex-col justify-center items-center w-full gap-6 p-10">
        <div className="flex flex-col items-start w-1/2">
          <label htmlFor="Email" className="text-sm text-zinc-500 mb-1">
            Email Address
          </label>
          <Input
            id="Email"
            disabled={isLoading}
            className="px-5 py-3 outline-none rounded-md w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter Mail Address"
          />
        </div>

        <div className="flex flex-col items-start w-1/2">
          <label htmlFor="Password" className="text-sm text-zinc-500 mb-1">
            Password
          </label>
          <Input
            id="Password"
            disabled={isLoading}
            className="px-5 py-3 outline-none rounded-md w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Password"
            type="password"
          />
        </div>
        {isLoading ?
          <span>
            <Loader size={28} />
          </span>
          :
          <button onClick={handleSubmit} className="w-1/2 bg-gray-600 rounded text-center text-white px-5 py-2" disabled={isLoading}>
            Sign in
          </button>
        }
      </div>
      <div className="flex items-center justify-center gap-2 w-full rounded-md px-4 py-2 cursor-pointer">
        <img src="./google.png" alt="Google logo" className="w-5 h-5" />
        <button onClick={handleGoogleLogin} className="text-sm font-medium text-gray-700" disabled={isLoading}>Continue with Google</button>
      </div>
      <div className="google-login and register ac flex gap-2 justify-center">
        Are you new?  <button onClick={() => setFlag(prev => !prev)} className='text-[#3ce368] font underline'>Create an Account</button>
      </div>
    </div>
  )
}

export default Login