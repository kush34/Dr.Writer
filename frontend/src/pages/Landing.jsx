import Hero from '@/components/Hero.jsx';
import Navbar from '../components/Navbar.jsx'
import Footer from '@/components/Footer.jsx';
import Features from '@/components/Features.jsx';
import Plans from '@/components/Plans.jsx';
import "./landing.css"
import { BackgroundLines } from '@/components/BackgroundLines.jsx';
const Landing = ()=>{
    
    return(
        <div className='w-full text-white relative overflow-hidden'>
            <div className="z-20 fixed flex w-full">
                <Navbar/>
            </div>
            {/* <div className="z-0"> */}
                <BackgroundLines/>
            {/* </div> */}
            <div className='z-20 h-screen flex justify-center items-center my-5'>
                <Hero/>
            </div>
            <div className='mt-10'>
                <Features/>
            </div>
            {/* <div className='mt-10'>
                <Plans/>
            </div> */}
            <div className='bottom-0 relative w-full'>
                <Footer/>
            </div>
        </div>
    )
}

export default Landing;
