import Hero from '@/components/Hero.jsx';
import Navbar from '../components/Navbar.jsx'
import Footer from '@/components/Footer.jsx';
import Features from '@/components/Features.jsx';
import { BackgroundLines } from '@/components/BackgroundLines.jsx';
import Plans from '@/components/Plans.jsx';
import FAQs from '@/components/FAQs.js';
import { useRef } from 'react';

const Landing = () => {
    const pricingRef = useRef(null);
    const executeScroll = () => pricingRef.current.scrollIntoView()
    return (
        <div className='w-full h-screen text-white relative'>
            <Navbar />
            <Hero executeScroll={executeScroll} />
            <Features />
            <Plans pricingRef={pricingRef} />
            <FAQs />
            <Footer />
        </div>
    )
}

export default Landing;
