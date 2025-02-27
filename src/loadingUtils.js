
// loadingUtils.js
export class LoadingTracker {
    static async retryWithBackoff(fn, maxRetries = 3) {
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                return await fn();
            } catch (error) {
                attempt++;
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }
}