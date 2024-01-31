
class NoAuth extends Error {
    statusCode: number;
    
    constructor(message: string) {
        super(message);
        this.name = 'NoAuth';
        this.statusCode = 410; 
      }
}

export default NoAuth;