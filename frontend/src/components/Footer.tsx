import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="website-footer">
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p className="copyright">© {new Date().getFullYear()} Microbanking System. All rights reserved.</p>
          <div className="footer-legal">
            <a href="#terms">Terms of Service</a>
            <span className="separator">|</span>
            <a href="#privacy">Privacy Policy</a>
            <span className="separator">|</span>
            <a href="#refund">Refund Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
