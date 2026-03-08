import { Link, useParams } from 'react-router-dom';
import logo from '../assets/logo.png.png';
import '../assets/styles/landing-header.css';
import { usePlatform } from '../pages/platformContext';

const LandingHeader = () => {
  const { business_slug } = useParams();
  const { platformName } = usePlatform();
  const slug = business_slug || 'defence';
  const handleContactClick = (e) => {
    const contactSection = document.querySelector('.contact');
    if (contactSection) {
      e.preventDefault();
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };
  const handleAboutClick = (e) => {
    const aboutSection = document.querySelector('.footer');
    if (aboutSection) {
      e.preventDefault();
      aboutSection.scrollIntoView({ behavior: 'smooth' });
    }
  };
  const handleBookingStatusClick = (e) => {
    const bookingStatusSection = document.querySelector('.booking-status');
    if (bookingStatusSection) {
      e.preventDefault();
      bookingStatusSection.scrollIntoView({ behavior: 'smooth' });
    }
  };
  return (
    <header className="landing-header">
      <div className="container landing-header-content">
        <div className='landing-logo-container'>
          <img src={logo} alt="ReserveNow Logo" className="landing-logo-img" />
          <span className='landing-header-title'>{platformName}</span>
        </div>
        <div className='landing-nav-links'>
          <li><Link to={`/customerservices/`}>Services</Link></li>
          <li><Link to="/" onClick={handleBookingStatusClick}>Status & Reviews</Link></li>
          <li><Link to="/" onClick={handleContactClick}>Contact</Link></li>
          <li><Link to="/" onClick={handleAboutClick}>About</Link></li>
        </div>
        <div className='landing-buttons'>
          <Link to="/adminlogin">
            <button className="landing-btn-admin">Admin login</button>
          </Link>
          <Link to={`/customerservices/`}>
            <button className="landing-btn-primary">Book a Service</button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
