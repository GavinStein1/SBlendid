function checkToken(expiry: string): boolean {
    try {
        const expiryNum = parseInt(expiry);
        const now = Math.floor(Date.now() / 1000);
        if (now > expiryNum) {
            return false;
        } else {
            return true;
        }
    } catch (error) {
        return false;
    }
}

export default checkToken;