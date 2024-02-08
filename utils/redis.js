import redis from 'redis';

class RedisClient {
    constructor() {
        this.client = redis.createClient();

        this.client.on('error', error => {
            console.error('Redis Client Error:', error);
        });
    }

    isAlive() {
        return this.client.connected;
    }

    async get(key) {
        return new Promise((resolve, reject) => {
            this.client.get(key, (error, reply) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(reply);
                }
            });
        });
    }

    async set(key, value, duration) {
        this.client.set(key, value, 'EX', duration);
    }

    async del(key) {
        this.client.del(key);
    }
}

const redisClient = new RedisClient();
export default redisClient;
