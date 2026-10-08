import logoSrc from '../../assets/images/logo.webp';

interface LogoProps {
  size?: number;
  className?: string;
  appearance?: 'customer';
}

const Logo = ({ size = 36, className = '', appearance }: LogoProps) => (
  <div
    className={appearance === 'customer' ? 'customer-brand__logo' : 'rounded-md overflow-hidden'}
  >
    <img
      src={logoSrc}
      alt="Yume Studio"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  </div>
);

export default Logo;
