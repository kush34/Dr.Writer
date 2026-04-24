import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

type navbarProps = {
  faqexecuteScroll: () => void
  executeScroll: () => void
}

const Navbar = ({ faqexecuteScroll, executeScroll }: navbarProps) => {
  const navigate = useNavigate();

  const links = [
    {
      title: "Features",
      link: '#',
      click: faqexecuteScroll
    },
    {
      title: "Pricing",
      link: '#',
      click: executeScroll
    },
    {
      title: "FAQs",
      link: '#',
      click: faqexecuteScroll
    }
  ]
  return (
    <div className='fixed w-full flex justify-center backdrop-filter backdrop-blur-2xl border-b p-5'>
      <div className='flex justify-between w-1/3 items-center gap-10'>
        <div className="brand font-bold">
          <img src="./icon.png" className='w-12 h-12' alt="" />
        </div>
        <div className="hidden xl:flex links gap-5">
          {links.map((link, index) => {
            return (
              <button key={index} onClick={link.click}>
                {link.title}
              </button>
            )
          })}
          <Button className='text-white'>
            Get Started
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Navbar