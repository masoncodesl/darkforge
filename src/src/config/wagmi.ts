import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'DarkForge',
  projectId: 'f4f5d7f7d7c6477f8a2c95c902439d33',
  chains: [sepolia],
  ssr: false,
});
