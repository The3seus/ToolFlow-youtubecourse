import 'dotenv/config';  
import { start } from './server';

start(Number(process.env.PORT) || 3000);
