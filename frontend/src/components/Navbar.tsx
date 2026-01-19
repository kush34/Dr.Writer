import { useNavigate } from 'react-router-dom';

type navbarProps = {
  faqexecuteScroll: () => void
  executeScroll: () => void
}

const Navbar = ({ faqexecuteScroll, executeScroll }: navbarProps) => {
  const navigate = useNavigate();

  const links = [
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
    <div className='fixed w-full flex justify-between backdrop-filter backdrop-blur-2xl border-b p-5'>
      <div className='flex justify-between w-1/2'>
        <div className="brand font-bold">
          DrWriter
        </div>
        <div className="hidden xl:flex links gap-5">
          {links.map((link, index) => {
            return (
              <button key={index} onClick={link.click}>
                {link.title}
              </button>
            )
          })}
        </div>
      </div>
      <div className="auths">
        <button onClick={() => navigate("/login")} className='bg-primary shadow text-background px-5 py-1 rounded-xl font-light cursor-pointer'>
          Create Account
        </button>
      </div>
    </div>
  )
}

export default Navbar