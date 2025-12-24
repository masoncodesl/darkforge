import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          <div className="header-left">
            <div>
              <p className="header-eyebrow">Encrypted arena</p>
              <h1 className="header-title">DarkForge</h1>
            </div>
          </div>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
