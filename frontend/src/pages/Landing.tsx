import Hero from '@/components/Hero.jsx';
import Navbar from '../components/Navbar.js'
import Footer from '@/components/Footer.jsx';
import Features from '@/components/Features.jsx';
import Plans from '@/components/Plans.jsx';
import FAQs from '@/components/FAQs.js';
import { useRef } from 'react';

const Landing = () => {
    const pricingRef = useRef<HTMLDivElement | null>(null);
    const executeScroll = () => {
        if (pricingRef && pricingRef.current) {
            pricingRef.current.scrollIntoView()
        }
    }

    const faqRef = useRef<HTMLDivElement | null>(null);
    const faqexecuteScroll = () => {
        if (faqRef && faqRef.current) {
            faqRef.current.scrollIntoView()
        }
    }
    return (
        <div className='w-full h-screen relative'>
            <Navbar faqexecuteScroll={faqexecuteScroll} executeScroll={executeScroll} />
            <Hero executeScroll={executeScroll} />
            <Features />
            <Plans pricingRef={pricingRef} />
            <FAQs faqRef={faqRef} />
            <Footer />
        </div>
    )
}

export default Landing;
