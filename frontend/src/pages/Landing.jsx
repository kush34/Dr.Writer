import Hero from '@/components/Hero.jsx';
import Navbar from '../components/Navbar.jsx'
import Footer from '@/components/Footer.jsx';
import Features from '@/components/Features.jsx';
import { BackgroundLines } from '@/components/BackgroundLines.jsx';
import Plans from '@/components/Plans.jsx';

const Landing = ()=>{
    
    return(
        <div className='w-full h-screen text-white relative'>
            <Navbar/>
            <Hero/>
            <Features/>
            <Plans/>
        </div>
    )
}

export default Landing;
