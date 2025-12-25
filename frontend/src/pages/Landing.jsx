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

    const faqRef = useRef(null);
    const faqexecuteScroll = () => faqRef.current.scrollIntoView()
    return (
        <div className='w-full h-screen text-white relative'>
            <Navbar faqexecuteScroll={faqexecuteScroll} executeScroll={executeScroll}/>
            <Hero executeScroll={executeScroll}/>
            <Features />
            <Plans pricingRef={pricingRef} />
            <FAQs faqRef={faqRef} />
            <Footer />
        </div>
    )
}

export default Landing;
