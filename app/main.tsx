import {createRoot} from 'react-dom/client';
import Storefront from './storefront';
import seed from '../public/catalog-seed.json';
import {productSchema} from './lib/product';
import './globals.css';
import './catalog.css';
createRoot(document.getElementById('root')!).render(<Storefront initial={seed.map(p=>productSchema.parse(p)).filter(p=>p.status==='available')}/>);
