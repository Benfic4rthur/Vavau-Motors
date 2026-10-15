import {createRoot} from 'react-dom/client';
import Admin from './admin';
import siteConfig from '../site.config.json';
import './globals.css';
import './admin.css';
if(location.hostname.endsWith('.github.io')&&siteConfig.adminUrl)location.replace(siteConfig.adminUrl);
else createRoot(document.getElementById('root')!).render(<Admin/>);
