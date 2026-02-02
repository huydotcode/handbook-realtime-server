import { Worker } from 'bullmq';
import { config } from '../common/config/config';
import { resend } from '../utils/resend';
import { EMailType, getOtpEmailHtml } from '../utils/mail-templates';

// Lazy initialization - only create worker when server starts (not during build)
let emailWorkerInstance: Worker | null = null;

export const initEmailWorker = () => {
    if (emailWorkerInstance) {
        console.log('[EmailWorker] Worker already initialized');
        return emailWorkerInstance;
    }

    const connection = {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
    };

    emailWorkerInstance = new Worker(
        'email-sending',
        async (job) => {
            const { to, otp, type } = job.data as {
                to: string;
                otp: string;
                type: EMailType;
            };

            console.log(`[EmailWorker] Processing job ${job.id} to ${to}`);

            const subject =
                type === EMailType.REGISTER
                    ? '[HANDBOOK] - OTP Đăng ký tài khoản'
                    : '[HANDBOOK] - OTP Đặt lại mật khẩu';

            const html = getOtpEmailHtml(otp, type);

            try {
                await resend.emails.send({
                    from: `Handbook <${config.resend.fromEmail}>`,
                    to,
                    subject,
                    html,
                });
                console.log(`[EmailWorker] Email sent to ${to}`);
            } catch (error) {
                console.error(
                    `[EmailWorker] Failed to send email to ${to}:`,
                    error
                );
                throw error;
            }
        },
        {
            connection,
        }
    );

    emailWorkerInstance.on('completed', (job) => {
        console.log(`[EmailWorker] Job ${job.id} completed!`);
    });

    emailWorkerInstance.on('failed', (job, err) => {
        console.error(
            `[EmailWorker] Job ${job?.id} failed with ${err.message}`
        );
    });

    console.log('[EmailWorker] Worker initialized');
    return emailWorkerInstance;
};

// Export getter for worker (for graceful shutdown)
export const getEmailWorker = () => emailWorkerInstance;
