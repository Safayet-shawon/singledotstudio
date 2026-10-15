import raw from '@config/pricing.json';
import type { Pricing } from './estimate';

export const pricing = raw as unknown as Pricing;
