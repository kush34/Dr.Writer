import Hero from '@/components/Hero.jsx';
import Navbar from '../components/Navbar.jsx'
import Footer from '@/components/Footer.jsx';
import Features from '@/components/Features.jsx';
import Plans from '@/components/Plans.jsx';
import "./landing.css"
const Landing = ()=>{
    
    return(
        <div className='w-full text-white'>
            <Navbar/>
            <div className='flex justify-center items-center my-5'>
                <Hero/>
            </div>
            <div className='mt-10'>
                <Features/>
            </div>
            <div className='mt-10'>
                <Plans/>
            </div>
            <div className='bottom-0 relative w-full'>
                <Footer/>
            </div>
        </div>
    )
}

export default Landing;