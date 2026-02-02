import { Resend } from 'resend';
import { config } from '../common/config/config';

export const resend = new Resend(config.resend.apiKey);
