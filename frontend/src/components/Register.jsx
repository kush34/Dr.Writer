import React, { useState } from 'react'
import { createUser } from '../firebaseAuth/firebaseConfig';
import { Description } from '@radix-ui/react-toast';
import { Loader } from 'lucide-react';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';

const Register = ({ setFlag }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const result = await createUser(email, password);

      if (!result.success) {
        console.log(result)
        console.log(result.message)
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
        return;
      }

      console.log("User created:", result.user);
      toast({ title: "Success", description: "Account created successfully!" });
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "Error",
        description: "Unexpected error occurred. Try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='flex flex-col gap-12 w-full h-screen bg-slate-100'>
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
            placeholder="Choose Password"
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
      <div className="google-login and register ac flex gap-2 justify-center">
        Already Have an Account?  <button onClick={() => setFlag(prev => !prev)} className='text-[#3ce368] font underline'>Sign in to Account</button>
      </div>
    </div>
  )
}

export default Register 