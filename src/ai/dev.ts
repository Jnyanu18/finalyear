
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

// Import all flows from the central index file.
import '@/ai/index';
