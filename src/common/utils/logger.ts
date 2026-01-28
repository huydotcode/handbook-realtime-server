export function log(event: string, data?: any) {
    console.log(`${event.toUpperCase()}:`);

    if (data) {
        console.log('\tARGS: ', data);
    }
}
