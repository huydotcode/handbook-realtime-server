export function log(event: string, data?: any) {
    console.log(
        `\n[${new Date().toLocaleTimeString()}] ${event.toUpperCase()}:`
    );

    if (data) {
        console.log('\tARGS: ', data);
    }
    console.log('====================================');
}
