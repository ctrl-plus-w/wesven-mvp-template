import { Resend } from 'resend';

import ENV from '@/env';

const resend = new Resend(ENV.RESEND_API_KEY);

export default resend;
